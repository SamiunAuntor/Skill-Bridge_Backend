import { NextFunction, Request, Response } from "express";

export type AsyncController<TRequest extends Request = Request> = (
    req: TRequest,
    res: Response,
    next: NextFunction
) => Promise<void>;

export function asyncHandler<TRequest extends Request = Request>(
    controller: AsyncController<TRequest>
) {
    return (req: TRequest, res: Response, next: NextFunction): void => {
        void controller(req, res, next).catch(next);
    };
}
