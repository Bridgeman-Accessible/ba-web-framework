import 'reflect-metadata';
import { Application } from 'express';

import { Initializer } from './Initializer';

/**
 * The top level container for running the web app
 */
export class App {
    /** The default port to run the server on (if the environment variable isn't set) */
    private readonly DEFAULT_PORT = 3000;

    /**
     * The main entry point for the web app
     * This is mostly required because of async/await
     */
    async run<T extends Initializer>(initializer?: T, callback?: (app: Application) => void | Promise<void>) {
        // Do the initial setup of the app
        let app: Application;
        if(typeof initializer !== 'undefined') {
            app = await initializer.init();
        }
        else {
            app = await (new Initializer()).init();
        }

        // Start the server
        const port = process.env.PORT || this.DEFAULT_PORT;
        app.listen(port, async () => { 
            console.log(`Server is running on port ${port}`);
            
            // Run the callback if one is provided
            if(typeof callback !== 'undefined') {
                await callback(app);
            }
        });
    }
}