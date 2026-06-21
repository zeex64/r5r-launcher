use std::{
    collections::{BTreeMap, HashMap},
    path::Path,
};

use crate::{
    models::{InstalledModEntry, InstalledModsState},
    paths::get_install_dir,
};

const MODS_DIR_NAME: &str = "mods";
const MODS_VDF_NAME: &str = "mods.vdf";
const MOD_VDF_NAME: &str = "mod.vdf";

pub(crate) fn get_installed_mods() -> Result<InstalledModsState, String> {
    let install_dir = get_install_dir()?;
    let mods_dir = install_dir.join(MODS_DIR_NAME);
    let enabled_lookup = read_enabled_mods(&mods_dir.join(MODS_VDF_NAME))?;

    if !mods_dir.exists() {
        return Ok(InstalledModsState {
            mods_dir: mods_dir.display().to_string(),
            total_count: 0,
            enabled_count: 0,
            items: Vec::new(),
        });
    }

    let mut items = Vec::new();
    let entries = std::fs::read_dir(&mods_dir)
        .map_err(|error| format!("Failed to inspect {}: {error}", mods_dir.display()))?;

    for entry in entries {
        let entry =
            entry.map_err(|error| format!("Failed to inspect mod entry in {}: {error}", mods_dir.display()))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();
        let manifest_path = path.join(MOD_VDF_NAME);
        let manifest = read_mod_manifest(&manifest_path)?;
        let mod_id = manifest.mod_id.clone();
        let enabled = enabled_lookup
            .get(&mod_id.to_lowercase())
            .copied()
            .unwrap_or(true);

        items.push(InstalledModEntry {
            folder_name: folder_name.clone(),
            enabled,
            name: fallback_if_empty(&manifest.name, &folder_name),
            mod_id,
            description: manifest.description,
            version: manifest.version,
            author: manifest.author,
            has_manifest: manifest.has_manifest,
        });
    }

    items.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));

    let enabled_count = items.iter().filter(|item| item.enabled).count();

    Ok(InstalledModsState {
        mods_dir: mods_dir.display().to_string(),
        total_count: items.len(),
        enabled_count,
        items,
    })
}

pub(crate) fn set_mod_enabled(folder_name: &str, enabled: bool) -> Result<InstalledModsState, String> {
    let install_dir = get_install_dir()?;
    let mods_dir = install_dir.join(MODS_DIR_NAME);
    let mod_path = mods_dir.join(folder_name);

    if !mod_path.is_dir() {
        return Err(format!("Couldn't find the mod folder \"{folder_name}\"."));
    }

    std::fs::create_dir_all(&mods_dir)
        .map_err(|error| format!("Failed to create {}: {error}", mods_dir.display()))?;

    let manifest = read_mod_manifest(&mod_path.join(MOD_VDF_NAME))?;
    if manifest.mod_id.trim().is_empty() {
        return Err(format!("The mod in \"{folder_name}\" is missing an id in mod.vdf."));
    }
    let mod_id = manifest.mod_id;

    let mods_vdf_path = mods_dir.join(MODS_VDF_NAME);
    let mut root = if mods_vdf_path.exists() {
        let contents = std::fs::read_to_string(&mods_vdf_path)
            .map_err(|error| format!("Failed to read {}: {error}", mods_vdf_path.display()))?;
        parse_vdf(&contents)?
    } else {
        BTreeMap::new()
    };

    let mut mod_list = match root.remove("ModList") {
        Some(VdfValue::Object(values)) => values,
        _ => BTreeMap::new(),
    };

    mod_list.insert(
        mod_id,
        VdfValue::String(if enabled { "1".into() } else { "0".into() }),
    );
    root.insert("ModList".into(), VdfValue::Object(mod_list));

    let contents = serialize_vdf_root(&root);
    std::fs::write(&mods_vdf_path, contents)
        .map_err(|error| format!("Failed to write {}: {error}", mods_vdf_path.display()))?;

    get_installed_mods()
}

fn read_enabled_mods(path: &Path) -> Result<HashMap<String, bool>, String> {
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let contents = std::fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
    let root = parse_vdf(&contents)?;
    let entries = match root.get("ModList") {
        Some(VdfValue::Object(values)) => values,
        _ => return Ok(HashMap::new()),
    };

    Ok(entries
        .iter()
        .filter_map(|(name, value)| match value {
            VdfValue::String(raw) => Some((name.to_lowercase(), raw.trim() == "1")),
            _ => None,
        })
        .collect())
}

fn read_mod_manifest(path: &Path) -> Result<ModManifest, String> {
    if !path.exists() {
        return Ok(ModManifest::default());
    }

    let contents = std::fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
    let root = parse_vdf(&contents)?;
    let Some(VdfValue::Object(mod_section)) = root.get("mod") else {
        return Ok(ModManifest {
            has_manifest: true,
            ..ModManifest::default()
        });
    };

    Ok(ModManifest {
        name: string_field(mod_section, "name"),
        mod_id: string_field(mod_section, "id"),
        description: string_field(mod_section, "description"),
        version: string_field(mod_section, "version"),
        author: string_field(mod_section, "author"),
        has_manifest: true,
    })
}

fn string_field(values: &BTreeMap<String, VdfValue>, key: &str) -> String {
    match values.get(key) {
        Some(VdfValue::String(value)) => value.clone(),
        _ => String::new(),
    }
}

fn fallback_if_empty(value: &str, fallback: &str) -> String {
    if value.trim().is_empty() {
        fallback.to_string()
    } else {
        value.to_string()
    }
}

#[derive(Default)]
struct ModManifest {
    name: String,
    mod_id: String,
    description: String,
    version: String,
    author: String,
    has_manifest: bool,
}

#[derive(Clone, Debug)]
enum VdfValue {
    String(String),
    Object(BTreeMap<String, VdfValue>),
}

fn serialize_vdf_root(root: &BTreeMap<String, VdfValue>) -> String {
    let mut output = String::new();
    for (key, value) in root {
        serialize_key_value(&mut output, key, value, 0);
    }
    output
}

fn serialize_key_value(output: &mut String, key: &str, value: &VdfValue, depth: usize) {
    let indent = "\t".repeat(depth);
    output.push_str(&indent);
    output.push('"');
    output.push_str(&escape_vdf_string(key));
    output.push('"');

    match value {
        VdfValue::String(string) => {
            output.push('\t');
            output.push('"');
            output.push_str(&escape_vdf_string(string));
            output.push_str("\"\n");
        }
        VdfValue::Object(object) => {
            output.push('\n');
            output.push_str(&indent);
            output.push_str("{\n");
            for (child_key, child_value) in object {
                serialize_key_value(output, child_key, child_value, depth + 1);
            }
            output.push_str(&indent);
            output.push_str("}\n");
        }
    }
}

fn escape_vdf_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn parse_vdf(input: &str) -> Result<BTreeMap<String, VdfValue>, String> {
    let tokens = tokenize_vdf(input)?;
    let mut parser = VdfParser::new(tokens);
    parser.parse_root()
}

fn tokenize_vdf(input: &str) -> Result<Vec<VdfToken>, String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut index = 0;

    while index < chars.len() {
        match chars[index] {
            '{' => {
                tokens.push(VdfToken::OpenBrace);
                index += 1;
            }
            '}' => {
                tokens.push(VdfToken::CloseBrace);
                index += 1;
            }
            '"' => {
                index += 1;
                let mut value = String::new();
                while index < chars.len() {
                    match chars[index] {
                        '"' => {
                            index += 1;
                            break;
                        }
                        '\\' if index + 1 < chars.len() => {
                            index += 1;
                            value.push(chars[index]);
                            index += 1;
                        }
                        ch => {
                            value.push(ch);
                            index += 1;
                        }
                    }
                }
                tokens.push(VdfToken::String(value));
            }
            '/' if index + 1 < chars.len() && chars[index + 1] == '/' => {
                index += 2;
                while index < chars.len() && chars[index] != '\n' {
                    index += 1;
                }
            }
            ch if ch.is_whitespace() => {
                index += 1;
            }
            _ => {
                let start = index;
                while index < chars.len()
                    && !chars[index].is_whitespace()
                    && chars[index] != '{'
                    && chars[index] != '}'
                {
                    index += 1;
                }
                tokens.push(VdfToken::String(chars[start..index].iter().collect()));
            }
        }
    }

    Ok(tokens)
}

#[derive(Clone, Debug)]
enum VdfToken {
    String(String),
    OpenBrace,
    CloseBrace,
}

struct VdfParser {
    tokens: Vec<VdfToken>,
    index: usize,
}

impl VdfParser {
    fn new(tokens: Vec<VdfToken>) -> Self {
        Self { tokens, index: 0 }
    }

    fn parse_root(&mut self) -> Result<BTreeMap<String, VdfValue>, String> {
        let mut object = BTreeMap::new();
        while self.index < self.tokens.len() {
            let key = self.expect_string()?;
            let value = self.parse_value()?;
            object.insert(key, value);
        }
        Ok(object)
    }

    fn parse_object(&mut self) -> Result<BTreeMap<String, VdfValue>, String> {
        let mut object = BTreeMap::new();

        loop {
            match self.peek() {
                Some(VdfToken::CloseBrace) => {
                    self.index += 1;
                    break;
                }
                Some(VdfToken::String(_)) => {
                    let key = self.expect_string()?;
                    let value = self.parse_value()?;
                    object.insert(key, value);
                }
                Some(VdfToken::OpenBrace) => {
                    return Err("Unexpected '{' in VDF object.".into());
                }
                None => return Err("Unterminated VDF object.".into()),
            }
        }

        Ok(object)
    }

    fn parse_value(&mut self) -> Result<VdfValue, String> {
        match self.peek() {
            Some(VdfToken::String(_)) => Ok(VdfValue::String(self.expect_string()?)),
            Some(VdfToken::OpenBrace) => {
                self.index += 1;
                Ok(VdfValue::Object(self.parse_object()?))
            }
            Some(VdfToken::CloseBrace) => Err("Unexpected '}' in VDF value.".into()),
            None => Err("Unexpected end of VDF input.".into()),
        }
    }

    fn expect_string(&mut self) -> Result<String, String> {
        match self.tokens.get(self.index) {
            Some(VdfToken::String(value)) => {
                self.index += 1;
                Ok(value.clone())
            }
            Some(VdfToken::OpenBrace) => Err("Expected VDF string but found '{'.".into()),
            Some(VdfToken::CloseBrace) => Err("Expected VDF string but found '}'.".into()),
            None => Err("Expected VDF string but reached end of input.".into()),
        }
    }

    fn peek(&self) -> Option<&VdfToken> {
        self.tokens.get(self.index)
    }
}
