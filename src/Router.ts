import path from 'path';
import { Application } from 'express';
import fse from 'fs-extra';

import { BaseController } from './controllers/BaseController';

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
    }

    /**
     * Check if a file is a controller
     * 
     * Note, if the specified "file" is a directory, this method will recurse into the directory and return all controllers found in the directory.
     * 
     * @param file The file to check if it is a controller
     * @param folder The folder that the file is in
     * @returns The controller class (or list of controller classes) in the "file" or null if the file is not a controller
     */
    private async checkIfControllerFile(file: string, folder: string): Promise<any /*BaseController*/ | any[]/*BaseController[]*/ | null> {
        // Get the path to the specific file
        const controllerPath = path.join(folder, file);

        // Check if the path is a directory/folder
        const stats = await fse.stat(controllerPath);
        if(stats.isDirectory()) {
            // Recurse into the directory
            const controllersFoundInDir = await Promise.all((await fse.readdir(controllerPath)).map(file => this.checkIfControllerFile(file, controllerPath)));
            const controllersInDir = controllersFoundInDir.filter(controller => controller !== null);
            return controllersInDir.length === 0 ? null : controllersInDir.flat();
        }
        
        // We only want to load JavaScript files (Note, Typescript files get compiled to JavaScript files)
        if(!controllerPath.endsWith('.js')) {
            return null;
        }
        
        // Load the file as a module
        const controllerModule = require(controllerPath);

        console.log(`${controllerPath} loaded successfully: ${JSON.stringify(Object.keys(controllerModule))} exports found.`)

        // Get all the classes in the module that are controllers
        // 
        // Note: We filter by if the class extends the `BaseController` class.
        //       This is because native JavaScript doesn't have decorators (which are used to mark a class as a controller).
        //       Consequently, we enforce that all controllers in addition to using the decorator must extend the `BaseController` class so that we can identify them.
        //       Further, note we can't do this as part of the decorator because of the way decorators get transpiled to JavaScript.
        const controllers = Object.keys(controllerModule)
            .filter(key => typeof controllerModule[key] === 'function' && /^\s*class\s+/.test(controllerModule[key].toString()))
            .filter(exportedClassName => controllerModule[exportedClassName].prototype instanceof BaseController)
            .map(controllerClassName => {
                return controllerModule[controllerClassName];
            });
        
        switch(controllers.length) {
            case 0:
                return null;
            case 1:
                return controllers[0];
            default:
                return controllers.flat();
        }
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
        
        return {
            GET: pathsGET,
            POST: pathsPOST
        }
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
        const loadedControllers = (await Promise.all(
            files.map(file => this.checkIfControllerFile(file, this.controllersPath/*, app*/))
        )).filter(controller => controller !== null);

        const addedRoutes: string[] = [];

        // Get all controllers that have the child controller decorator
        const controllersWithChildControllers = loadedControllers.filter(controller => Reflect.getMetadata('ChildController', controller) !== undefined);
        
        // Get all those controllers that are designated as children controllers by parent controllers
        const childrenControllers = controllersWithChildControllers.map(controller => Reflect.getMetadata('ChildController', controller));

        // Get the exclusive set of controllers that don't fit in the group of controllers with child controllers OR a child controller themselves
        const controllersWithoutChildren = loadedControllers.filter(controller => !controllersWithChildControllers.includes(controller) && !childrenControllers.includes(controller));

        // Take the list of controllers with child controllers and the list without children (that excludes children themselves)
        // And forma a list that has all child controllers remove
        const topLevelControllers = [...controllersWithChildControllers, ...controllersWithoutChildren];

        // Add the routes for the child controllers to the list of added routes WITHOUT calling the setup method (as this is called in the parent controller's setup method)
        childrenControllers
            .forEach(decoratedController => {
                if(Array.isArray(decoratedController)) {
                    decoratedController.forEach(decoratedControllerCls => {
                        const controller = Reflect.getMetadata('originalClass', decoratedControllerCls);
                        
                        const routes = this.getRoutesInController(controller);
                        routes.GET.forEach((path: string) => {
                            addedRoutes.push(`GET ${path} from ${(new controller()).constructor.name}`);
                        });
                        routes.POST.forEach((path: string) => {
                            addedRoutes.push(`POST ${path} from ${(new controller()).constructor.name}`);
                        });
                    });
                }
                else {
                    const controller = Reflect.getMetadata('originalClass', decoratedController);
                    
                    const routes = this.getRoutesInController(controller);
                    routes.GET.forEach((path: string) => {
                        addedRoutes.push(`GET ${path} from ${(new controller()).constructor.name}`);
                    });
                    routes.POST.forEach((path: string) => {
                        addedRoutes.push(`POST ${path} from ${(new controller()).constructor.name}`);
                    });
                }
            });

        // Add the routes for the top level controllers to the list of added routes and call the setup method
        topLevelControllers
            .forEach(decoratedController => {
                if(Array.isArray(decoratedController)) {
                    decoratedController.forEach(decoratedControllerCls => {
                        const controller = Reflect.getMetadata('originalClass', decoratedControllerCls);
                        
                        const routes = this.getRoutesInController(controller);
                        routes.GET.forEach((path: string) => {
                            addedRoutes.push(`GET ${path} from ${(new controller()).constructor.name}`);
                        });
                        routes.POST.forEach((path: string) => {
                            addedRoutes.push(`POST ${path} from ${(new controller()).constructor.name}`);
                        });
                        
                        decoratedControllerCls.setup(app);
                    });
                }
                else {
                    const controller = Reflect.getMetadata('originalClass', decoratedController);
                    
                    const routes = this.getRoutesInController(controller);
                    routes.GET.forEach((path: string) => {
                        addedRoutes.push(`GET ${path} from ${(new controller()).constructor.name}`);
                    });
                    routes.POST.forEach((path: string) => {
                        addedRoutes.push(`POST ${path} from ${(new controller()).constructor.name}`);
                    });
                    (decoratedController as any).setup(app);
                }
            });
        
        console.log('Routes added:');
        addedRoutes.forEach(route => console.log('\t' + route));
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