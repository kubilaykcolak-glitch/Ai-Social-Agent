export class GenerationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GenerationError";
  }
}

export class ReviewError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "ReviewError";
  }
}

export class PublishError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "PublishError";
  }
}
