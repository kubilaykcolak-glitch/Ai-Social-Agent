// Side-effect import: loads a .env file (from the current working directory) into
// process.env before any loadConfig() call reads it. Import this FIRST in every CLI
// entrypoint. Missing .env is fine — dotenv is a no-op then.
import "dotenv/config";
