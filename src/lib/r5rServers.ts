export type R5RServer = {
  name?: string;
  description?: string;
  map?: string;
  playlist?: string;
  region?: string;
  numPlayers?: number;
  maxPlayers?: number;
  authEnabled?: boolean;
  hidden?: boolean;
  serverId?: string;
};

type R5RServersResponse = {
  success: boolean;
  servers: R5RServer[];
};

export type R5RServerCounts = {
  playerCount: number;
  serverCount: number;
};

export async function getR5RServers(): Promise<R5RServer[]> {
  const response = await fetch("https://r5r.org/servers", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`R5R servers returned ${response.status}`);
  }

  const data = (await response.json()) as R5RServersResponse;
  return data.servers;
}

export function getR5RServerCountsFromList(servers: R5RServer[]): R5RServerCounts {
  const serverCount = servers.length;
  const playerCount = servers.reduce(
    (sum, server) => sum + (server.numPlayers || 0),
    0,
  );

  return { playerCount, serverCount };
}

export async function getR5RServerCounts(): Promise<R5RServerCounts> {
  const servers = await getR5RServers();
  return getR5RServerCountsFromList(servers);
}
