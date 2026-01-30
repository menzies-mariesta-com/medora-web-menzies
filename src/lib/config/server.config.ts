// private env only
import { env } from "$env/dynamic/private";

export class ServerConfig {

    // server address => http://localhost:1025 (default for local dev)
    getServerAddress(): string {
        return "local"
    }
}
