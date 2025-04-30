import 'reflect-metadata';
import { Application } from 'express';

import { Initializer } from './Initializer';

/**
 * The top level container for running the web app
 */
export class App {
    /** The default port to run the server on (if the environment variable isn't set) */
    private readonly DEFAULT_PORT = 3000;

    private initializer?: Initializer;

    getInitializer() {
        if(typeof this.initializer === 'undefined') {
            throw new Error('Initializer is not set. Please call run() first.');
        }

        return this.initializer;
    }

    getExpressApp() {
        return this.getInitializer().getExpressApp();
    }

    /**
     * The main entry point for the web app
     * This is mostly required because of async/await
     */
    async run<T extends Initializer>(initializer?: T, callback?: (app: App) => void | Promise<void>, onErrorCallback?: (error: any) => void | Promise<void>) {
        // Do the initial setup of the app
        if(typeof initializer !== 'undefined') {
            this.initializer = initializer;
        }
        else {
            this.initializer = new Initializer();
        }

        await this.initializer.init();

        // Start the server
        const port = process.env.PORT || this.DEFAULT_PORT;
        this.getExpressApp().listen(port, async () => { 
            console.log(`Server is running on port ${port}`);
            
            // Run the callback if one is provided
            if(typeof callback !== 'undefined') {
                await callback.bind(this)(this);
            }
        })
            .on('error', async (error) => {
                console.error('Error starting server:', error);

                if(typeof onErrorCallback !== 'undefined') {
                    await onErrorCallback(error);
                }
            });
    }
}