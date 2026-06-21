import { useEffect, useState } from "react";
import {
  getR5RServerCountsFromList,
  getR5RServers,
  type R5RServer,
} from "../lib/r5rServers";

export function useServerBrowserData() {
  const [playerCount, setPlayerCount] = useState("...");
  const [serverCount, setServerCount] = useState("...");
  const [servers, setServers] = useState<R5RServer[]>([]);
  const [serversLoading, setServersLoading] = useState(true);
  const [serversError, setServersError] = useState<string | null>(null);

  const loadServers = async () => {
    try {
      const nextServers = await getR5RServers();
      setServers(nextServers);
      setServersError(null);

      const counts = getR5RServerCountsFromList(nextServers);
      setPlayerCount(counts.playerCount.toLocaleString("en-US"));
      setServerCount(counts.serverCount.toLocaleString("en-US"));
    } catch (error: unknown) {
      setServersError(
        error instanceof Error
          ? error.message
          : "We couldn't load the live server list right now.",
      );
      setPlayerCount("--");
      setServerCount("--");
    } finally {
      setServersLoading(false);
    }
  };

  useEffect(() => {
    void loadServers();
    const intervalId = window.setInterval(() => {
      void loadServers();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    playerCount,
    serverCount,
    servers,
    serversLoading,
    serversError,
    refreshServers: () => {
      setServersLoading(true);
      void loadServers();
    },
  };
}
