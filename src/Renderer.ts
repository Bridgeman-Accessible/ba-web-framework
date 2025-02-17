import { existsSync, statSync } from 'fs';
import path from 'path';
import { Application } from 'express';

import { BaseTemplateInputs, BaseTemplateCreator } from './BaseTemplateCreator';

export class Renderer {
    /** The default folder name for the views */
    private readonly DEFAULT_VIEWS_FOLDER = 'pages';

    /** The view engine to use (Ex. EJS, Pug, etc...) */
    private engine: string;

    /** The path to the folder/directory that contains the view files (Ex. EJS files) */
    private viewsDir: string;

    /**
     * Creates a new instance of the Renderer class
     * 
     * Note, that if the base template doesn't exist and the engine is `ejs`, then a base template will be created automatically.
     * 
     * @param viewsDir The path to the folder/directory that contains the view files
     * @param engine The view engine to use (Ex. EJS, Pug, etc...)
     * @param baseTemplateInputs The inputs to use for the base template (if the template is generated)
     * @throws Error if the pages path is not a valid directory
     */
    constructor(viewsDir: string = path.join(process.cwd(), this.DEFAULT_VIEWS_FOLDER), engine: string = 'ejs', baseTemplateInputs?: BaseTemplateInputs) {
        // Verify the views directory exists and is a directory
        if(!existsSync(viewsDir) || !statSync(viewsDir).isDirectory()) {
            throw new Error('The views directory must be a valid directory');
        }

        this.viewsDir = path.resolve(viewsDir);
        this.engine = engine;

        // We can only automatically generate a base template if the engine is `ejs` 
        // We also don't want to generate a base template if one already exists
        if(this.engine === 'ejs' && !existsSync(path.resolve(this.viewsDir, 'base.ejs'))) {
            BaseTemplateCreator.create(this.viewsDir, baseTemplateInputs);
        }
    }
    
    /**
     * Sets up the views for the Express app
     * 
     * @param app The Express app to setup the views for
     */
    setup(app: Application) {
        // Set the view engine to the appropriate value (ex. `ejs`) and to serve views from the view files directory
        app.set('view engine', this.engine);
        app.set('views', this.viewsDir);
    }
}