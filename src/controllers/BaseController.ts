import { Application } from 'express';

export abstract class BaseController {
    static setup(app: Application) {}
}