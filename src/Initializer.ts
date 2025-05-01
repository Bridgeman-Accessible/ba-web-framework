import express, { Application, RequestHandler } from 'express';

import { Router } from './Router';
import { StaticFileResolver } from './StaticFileResolver';
import { Renderer } from './Renderer';

/**
 * Object to encapsulate the setup of the app
 * 
 * This is passed to the App object's `run` method.
 * This approach allows easy injection of customizations to the app setup with minimal code.
 * This is done by creating a customized version of the Initializer class (setting the constructor parameters).
 * Or by creating a child class of the Initializer class and overriding the `init` method.
 */
export class Initializer {
    /** The path to the controllers */
    private controllersPath?: string;

    /** The path to the static files (css, js, etc...) */
    private staticFilesPath?: string;

    /** The view engine and path to the view files */
    private view?: { filesPath: string, engine?: string };

    /** The middlewares to use */
    private middlewares: ((...args: any[]) => RequestHandler)[];

    private app?: Application;
    private router?: Router;

    /**
     * Create a new Initializer
     * 
     * Note, that the parameter is an object of inputs that can be used to customize the setup.
     * It's done this way because most of the customizations are optional and order doesn't matter.
     * 
     * @param inputs The inputs for the initializer
     * @param inputs.controllersPath The path to the controllers
     * @param inputs.staticFilesPath The path to the static files (css, js, etc...)
     * @param inputs.view.engine The view engine to use (ex. 'ejs')
     * @param inputs.view.filesPath The path to the view files
     * @param middlewares Th middlewares to use
     */
    constructor(inputs?: { controllersPath?: string, staticFilesPath?: string, view?: { filesPath: string, engine?: string } }, ...middlewares: ((...args: any[]) => RequestHandler)[]) {
        this.controllersPath = typeof inputs !== 'undefined' && inputs.controllersPath !== 'undefined' ? inputs.controllersPath : undefined;
        this.staticFilesPath = typeof inputs !== 'undefined' && inputs.staticFilesPath !== 'undefined' ? inputs.staticFilesPath : undefined;
        this.view = typeof inputs !== 'undefined' && typeof inputs.view !== 'undefined' ? inputs.view : undefined;
        
        this.middlewares = middlewares;
    }

    getExpressApp() {
        if(typeof this.app === 'undefined') {
            throw new Error('App is not set. Please call init() first.');
        }

        return this.app;
    }

    getRouter() {
        if(typeof this.router === 'undefined') {
            throw new Error('Router is not set. Please call init() first.');
        }

        return this.router;
    }

    /**
     * Create the Express app
     * 
     * @returns The newly created Express app
     */
    private async createExpressApp(): Promise<Application> {
        // Create the Express app
        this.app = express();

        return this.app;
    }

    /**
     * Setup the global middleware for the server
     * 
     * @param app The Express app to setup the middleware on
     */
    private async setupMiddleware(app: Application) {
        this.middlewares.forEach(middleware => app.use(middleware()));
    }

    /**
     * Do the initial setup for the application
     * 
     * @returns The Express app that gets created and setup
     */
    async init() {
        // Create the Express app
        const app = await this.createExpressApp();

        // Setup global middleware
        await this.setupMiddleware(app);

        // Setup the static file resolver (how the app serves static files)
        if(typeof this.staticFilesPath !== 'undefined') {
            await (new StaticFileResolver(this.staticFilesPath)).setup(app);
        }
        else {
            await (new StaticFileResolver()).setup(app);
        }

        // Setup the renderer (how the app renders templates - templates can use any Express supported view engine)
        if(typeof this.view !== 'undefined') {
            if(typeof this.view.engine !== 'undefined') {
                await (new Renderer(this.view.filesPath, this.view.engine)).setup(app);
            }
            else {
                await (new Renderer(this.view.filesPath)).setup(app);
            }
        }
        else {
            await (new Renderer()).setup(app);
        }

        // Setup the router (how the app handles requests)
        if(typeof this.controllersPath !== 'undefined') {
            this.router = new Router(this.controllersPath);
        }
        else {
            this.router = new Router();
        }
        await this.router.setup(app);
    }
}