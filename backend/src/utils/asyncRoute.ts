import type { Request, RequestHandler, Response } from "express";

/** Express 4 does not await async route handlers; forward rejections to `next`. */
export function asyncRoute(
  fn: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res).catch(next);
  };
}
