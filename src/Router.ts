import path from 'path';
import { Application } from 'express';
import fse from 'fs-extra';

import { BaseController } from './controllers/BaseController';
import { ErrorController } from './controllers/ErrorController';

/**
 * The Router sets up the routes/endpoints for the App.
 * 
 * More specifically, it does automatic detection of controllers (and their routes) within the specified folder.
 * 
 * A controller is a class that extends the `BaseController` class and uses the `@Controller` decorator.
 * Routes within a controller are defined by methods that use the `@GET` or `@POST` decorators.
 */
export class Router {
    /** The default folder name for controllers */
    private readonly DEFAULT_CONTROLLERS_FOLDER = 'routes';

    /** The path to the controllers folder */
    private controllersPath: string;

    private outsideFrameworkRoutes: string[]; 

    /**
     * Create a new Router
     * 
     * @param controllersPath The path to the controllers folder (default is 'routes' in the current working directory)
     * @throws Error if the controllers path is not a valid directory
     */
    constructor(controllersPath: string = path.join(process.cwd(), this.DEFAULT_CONTROLLERS_FOLDER)) {
        if(!fse.existsSync(controllersPath) || !fse.statSync(controllersPath).isDirectory()) {
            throw new Error('The controllers path must be a valid directory');
        }
        
        this.controllersPath = path.resolve(controllersPath);

        this.outsideFrameworkRoutes = [];
    }

    addOutsideFrameworkRoute(route: string) {
        if(!this.outsideFrameworkRoutes.includes(route)) {
            this.outsideFrameworkRoutes.push(route);
        }
    }

    /**
     * Check if a file is a controller
     *
     * Note, if the specified "file" is a directory, this method will recurse into the directory and return all controllers found in the directory.
     *
     * It's worth noting that typing in this method is deliberate but confusing.
     * This is because decorators introduce a lot of complexity because they introduce this anonymous wrapper function/class around the original function/class.
     * However, because of how we typed the decorator, we can use `instanceof` and hiarchtical typing.
     * Though we do typing of variables that would otherwise be any and DON'T explicitly cast.
     *
     * @param file The file to check if it is a controller
     * @param folder The folder that the file is in
     * @returns An object with 2 properties: a `controllers` property which holds the controller class (or list of controller classes) in the "file" or null if the file is not a controller and `errorControllers` property which holds the error controller class (or list of error controller classes) in the "file" or null if the file is not an error controller.
     */
    private async checkIfControllerFile(file: string, folder: string): Promise<{ controllers: BaseController | BaseController[] | null, errorControllers: (new (...args: any[]) => ErrorController) | (new (...args: any[]) => ErrorController)[] | null }> {
        // Get the path to the specific file
        const controllerPath = path.join(folder, file);

        // Check if the path is a directory/folder and recurse if it is
        const stats = await fse.stat(controllerPath);
        if(stats.isDirectory()) {
            // Recurse into the directory
            const controllersFoundInDir = await Promise.all((await fse.readdir(controllerPath)).map(file => this.checkIfControllerFile(file, controllerPath)));
            const controllersInDir = controllersFoundInDir.filter(controller => controller !== null);
            if(controllersInDir.length === 0) {
                return { controllers: null, errorControllers: null };
            }
            else {
                return {
                    controllers: controllersInDir.map(controllerInDir => controllerInDir.controllers).length > 1 ? controllersInDir.map(controllerInDir => controllerInDir.controllers).filter(ctlr => ctlr !== null).flat() : controllersInDir.map(controllerInDir => controllerInDir.controllers)[0],
                    errorControllers: controllersInDir.map(controllerInDir => controllerInDir.errorControllers).length > 1 ? controllersInDir.map(controllerInDir => controllerInDir.errorControllers).filter(ctlr => ctlr !== null).flat() : controllersInDir.map(controllerInDir => controllerInDir.errorControllers)[0]
                };
            }
        }

        // We only want to load JavaScript files (Note, Typescript files get compiled to JavaScript files)
        if(!controllerPath.endsWith('.js')) {
            return { controllers: null, errorControllers: null };
        }
        
        // Load the file as a module
        const controllerModule = require(controllerPath);

        console.log(`${controllerPath} loaded successfully: ${JSON.stringify(Object.keys(controllerModule))} exports found.`)

        // Get all the classes in the module
        const classes = Object.keys(controllerModule)
            .filter(key => typeof controllerModule[key] === 'function' && /^\s*class\s+/.test(controllerModule[key].toString()));
        
        // Get all the classes in the module that are controllers
        // 
        // Note: We filter by if the class extends the `BaseController` class.
        //       This is because native JavaScript doesn't have decorators (which are used to mark a class as a controller).
        //       Consequently, we enforce that all controllers in addition to using the decorator must extend the `BaseController` class so that we can identify them.
        //       Further, note we can't do this as part of the decorator because of the way decorators get transpiled to JavaScript.
        const controllers: BaseController[] = classes
            .filter(exportedClassName => controllerModule[exportedClassName].prototype instanceof BaseController)
            .map(controllerClassName => {
                return controllerModule[controllerClassName];
            });

        // Get all the classes in the module that are error controllers (these are subtly different from normal controllers)
        // 
        // We do this here, instead of braking it out into it's own separate method for efficiency reasons.
        // 
        // Note: We filter by if the class extends the `ErrorController` class.
        //       This is because native JavaScript doesn't have decorators (which are used to mark a class as a error controller).
        //       Consequently, we enforce that all error controllers in addition to using the decorator must extend the `ErrorController` class so that we can identify them.
        //       Further, note we can't do this as part of the decorator because of the way decorators get transpiled to JavaScript.
        const errorControllers: ErrorController[] = classes
            .filter(exportedClassName => controllerModule[exportedClassName].prototype instanceof ErrorController)
            .map(controllerClassName => {
                return controllerModule[controllerClassName];
            });
        
        let foundControllers;
        switch (controllers.length) {
            case 0:
                foundControllers = null;
            case 1:
                foundControllers = controllers[0];
            default:
                foundControllers = controllers.flat();
        }

        let foundErrorControllers;
        switch (errorControllers.length) {
            case 0:
                foundErrorControllers = null;
            case 1:
                foundErrorControllers = errorControllers[0];
            default:
                foundErrorControllers = errorControllers.flat();
        }

        return { controllers: foundControllers, errorControllers: foundErrorControllers };
    }

    /**
     * Get the routes in a controller
     * 
     * A route is defined by a method in the controller that has the `@GET` or `@POST` decorator.
     * 
     * @param controller The controller to get the routes from
     * @returns The routes in the controller
     */
    private getRoutesInController(controller: any) {
        if (typeof controller === 'undefined') {
            console.error(`Something went wrong while processing ${JSON.stringify(controller)}`);
            throw new Error('The controller must be a class');
        }
        
        // Loop over all the methods in the provided class looking for methods that use the GET decorator
        const pathsGET = Object.getOwnPropertyNames(controller.prototype)
            // Find all methods that have a Get metadata key (GET decorator)
            .filter((method) => Reflect.getMetadata('Get', controller.prototype, method))
            .map((method) => {
                // Get the method
                const fn = controller.prototype[method];

                // Get the path
                const path = Reflect.getMetadata('Get', controller.prototype, method) as string;

                return path;
            });
                
        // Loop over all the methods in the provided class looking for methods that use the POST decorator
        const pathsPOST = Object.getOwnPropertyNames(controller.prototype)
            // Find all methods that have a Post metadata key (POST decorator)
            .filter((method) => Reflect.getMetadata('Post', controller.prototype, method))
            .map((method) => {
                // Get the method
                const fn = controller.prototype[method];

                // Get the metadata object (which contains a path and middleware)
                const postRoute = Reflect.getMetadata('Post', controller.prototype, method);
                const path = postRoute.path;
                    
                return path;
            });
        
        // Loop over all the methods in the provided class looking for methods that use the `@PUT` decorator
        const pathsPUT = Object.getOwnPropertyNames(controller.prototype)
            // Find all methods that have a `Put` metadata key (`@PUT` decorator)
            .filter((method) => Reflect.getMetadata('Put', controller.prototype, method))
            .map((method) => {
                // Get the method
                const fn = controller.prototype[method];
            
                // Get the metadata object (which contains a path and middleware)
                const putRoute = Reflect.getMetadata('Put', controller.prototype, method);
                const path = putRoute.path;
                
                return path;
            });
        
        // Loop over all the methods in the provided class looking for methods that use the `@DELETE` decorator
        const pathsDELETE = Object.getOwnPropertyNames(controller.prototype)
            // Find all methods that have a `Delete` metadata key (`@DELETE` decorator)
            .filter((method) => Reflect.getMetadata('Delete', controller.prototype, method))
            .map((method) => {
                // Get the method
                const fn = controller.prototype[method];
                // Get the metadata object (which contains a path and middleware)
                const deleteRoute = Reflect.getMetadata('Delete', controller.prototype, method);
                const path = deleteRoute.path;
                return path;
            });
        
        return {
            GET: pathsGET,
            POST: pathsPOST,
            PUT: pathsPUT,
            DELETE: pathsDELETE
        }
    }

    async processControllerRoutes(app: Application, decoratedController: any | any[], callSetup: boolean = true) {
        let addedRoutes: string[] = [];

        // If the input is an array, recurse over the array
        if (Array.isArray(decoratedController)) {
            //console.log('Is an array - recursing...')
            addedRoutes = addedRoutes.concat((await Promise.all(decoratedController.map(async (decoratedControllerCls) => await this.processControllerRoutes(app, decoratedControllerCls, callSetup)))).flat());
        }
        else {
            const controller = Reflect.getMetadata('originalClass', decoratedController);
            
            //console.log(`Processing ${(typeof controller).toString()} - ${typeof controller !== 'undefined' && controller !== null && typeof controller.name !== 'undefined' ? controller.name : 'unknown'} (${(typeof decoratedController).toString()} - ${typeof decoratedController !== 'undefined' && decoratedController !== null && typeof decoratedController.name !== 'undefined' ? decoratedController.name : 'unknown'})...`);
            
            let routes: { GET: string[], POST: string[], PUT: string[], DELETE: string[] } = { GET: [], POST: [], PUT: [], DELETE: [] };
            try {
                routes = this.getRoutesInController(controller);
            }
            catch (e) {
                console.error(`Something went wrong while processing ${JSON.stringify(controller)} (${JSON.stringify(decoratedController)})`);
            }
            
            routes.GET.forEach((path) => {
                addedRoutes.push(`GET ${path} from ${(new controller()).constructor.name}`);
            });
            
            routes.POST.forEach((path) => {
                addedRoutes.push(`POST ${path} from ${(new controller()).constructor.name}`);
            });
            
            routes.PUT.forEach((path) => {
                addedRoutes.push(`PUT ${path} from ${(new controller()).constructor.name}`);
            });
            
            routes.DELETE.forEach((path) => {
                addedRoutes.push(`DELETE ${path} from ${(new controller()).constructor.name}`);
            });
            
            // Because we reuse this method for adding information about the child routes but we don't want to call the setup method (because it's called on the parent controller)
            // We have a switch to determine if we should call the setup method or not.
            if (callSetup) {
                decoratedController.setup(app);
            }
        }

        return addedRoutes;
    }

    /**
     * Setup the controllers for the application
     * 
     * This loops over all the "files" in the directory (this includes subdirectories) and finds any controllers.
     * A controller being a class that extends the BaseController class and uses the `@Controller` decorator.
     * Once it knows the controllers it adds the routes they contain to the Express app.
     * Routes are defined by methods in the controller that have the `@GET` or `@POST` decorators.
     * 
     * @param app The Express app to add the routes to
     */
    private async setupControllers(app: Application) {
        // Get the list of files in the controllers folder
        const files = await fse.readdir(this.controllersPath);

        // Get the controller classes from the files
        const loadedControllerObjects = (await Promise.all(files.map(async (file) => (await this.checkIfControllerFile(file, this.controllersPath /*, app*/)))));
        
        const loadedControllers: BaseController[] = loadedControllerObjects
            .map(loadedControllerObjects => loadedControllerObjects.controllers)
            .filter(controller => controller !== null)
            .flat();

        let addedRoutes: string[] = [];

        // Get all controllers that have the child controller decorator
        const controllersWithChildControllers = loadedControllers.filter(controller => Reflect.getMetadata('ChildController', controller) !== undefined);
        
        // Get all those controllers that are designated as children controllers by parent controllers
        const childrenControllers = controllersWithChildControllers.map(controller => Reflect.getMetadata('ChildController', controller));
        
        // Get the exclusive set of controllers that don't fit in the group of controllers with child controllers OR a child controller themselves
        const controllersWithoutChildren = loadedControllers.filter(controller => !controllersWithChildControllers.includes(controller) && !childrenControllers.includes(controller));
        
        // Take the list of controllers with child controllers and the list without children (that excludes children themselves)
        // And forma a list that has all child controllers remove
        const topLevelControllers = [...controllersWithChildControllers, ...controllersWithoutChildren];
        
        //console.log(`Child controllers: ${childrenControllers.map(controller => (typeof controller).toString() + ' - ' + (typeof controller !== 'undefined' && controller !== null ? controller.name : 'unknown')).join(', ')}`);
        
        // Add the routes for the child controllers to the list of added routes WITHOUT calling the setup method (as this is called in the parent controller's setup method)
        addedRoutes = addedRoutes.concat((await Promise.all(childrenControllers.map(async (decoratedController) => await this.processControllerRoutes(app, decoratedController, false)))).flat());
        
        //console.log(`Top level controllers: ${topLevelControllers.map(controller => (typeof controller).toString() + ' - ' + (typeof controller !== 'undefined' && controller !== null ? controller.name : 'unknown')).join(', ')}`);
        
        // Add the routes for the top level controllers to the list of added routes and call the setup method
        addedRoutes = addedRoutes.concat((await Promise.all(topLevelControllers.map(async (decoratedController) => await this.processControllerRoutes(app, decoratedController)))).flat());
        
        console.log('Routes added:');
        addedRoutes.forEach(route => console.log('\t' + route));
        
        // Adding a GET handler/middleware to handle 404 errors
        // This is done by adding this as the last path (after all other routes)
        app.get('*', (req, res, next) => {
            // Check if the request path is in the list of outside framework routes
            // This is used to allow routes outside the framework to work without getting a 404 error
            if(this.outsideFrameworkRoutes.includes(req.path)) {
                return next();
            }
            
            res.status(404);
            next('Page Not Found');
        });

        const loadedErrorControllers = loadedControllerObjects
            .map(loadedControllerObject => loadedControllerObject.errorControllers)
            .filter(controller => controller !== null)
            .flat()
            .map(ErrorControllerClassConstructor => new ErrorControllerClassConstructor());
        
        let handledErrors: string[] = [];
        loadedErrorControllers.forEach(errorController => {
            if (typeof errorController.handle === 'undefined') {
                console.error(`Something went wrong while processing ${JSON.stringify(Object.entries(errorController))}`);
                return;
            }

            app.use(errorController.handle.bind(errorController));
            handledErrors.push(errorController.handlesError ?? '');
        });

        console.log('Error controllers added:');
        handledErrors.forEach(error => console.log('\t' + error));
    }

    /**
     * Setup the routes for the application
     * 
     * @param app The Express app to add the routes to
     */
    async setup(app: Application) {
        console.log('Setting up routes...')

        await this.setupControllers(app);
    }
}