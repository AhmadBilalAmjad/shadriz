import { DbDialect, ScaffoldOpts } from "../lib/types";
import { logCmd, logGhost } from "../lib/utils";

export abstract class BaseDbDialectStrategy {
  public abstract dialect: DbDialect;
  public abstract init(): void;
  public abstract scaffold(opts: ScaffoldOpts): void;
  public abstract appendAuthSchema(): void;
  public abstract copyCreateUserScript(): void;
  protected abstract copyDrizzleConfig(): void;
  protected abstract copySchema(): void;
  public printInitCompletionMessage() {
    logGhost("\n✅ db setup success: " + this.dialect);
    logGhost("\n👉 recommended next step:");
    logCmd("npx shadriz auth -h");
    logCmd("npx shadriz scaffold -h");
  }
}
