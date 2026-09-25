export class CapitalEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapitalEngineError";
  }
}
