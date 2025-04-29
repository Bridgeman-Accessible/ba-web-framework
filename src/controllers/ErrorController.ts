import { Request, Response, NextFunction } from 'express';

export abstract class ErrorController {
    /** A human readable string to describe the error this controller handles. */
    public handlesError?: string;
    
    
    abstract handle(error: unknown, req: Request, res: Response, next: NextFunction): any | Promise<any>;
}