# Bridgeman Accessible Web Framework
A framework for web apps built atop [Node](https://nodejs.org/en), [Express.js](https://expressjs.com/) and other libraries and utilities that make creating and maintaining web apps easier.

Admittedly, this is not a mature, feature complete, etc... framework compared to others that already exist (ex. [NEXT.JS](https://nextjs.org/), [Nuxt](https://nuxt.com/), etc...). The intention of this framework is largely to simplify existing Express apps in a way that they become more readable and learnable quickly for people that come from other frameworks and languages.

## Requirements
- ~~Has a `base.ejs` file~~ (or use the `BaseTemplateCreator` to create one - [**new**] which the `Renderer` will do automatically)
- Uses Typescript 5.4.5 or greater (because decorators don't compile properly otherwise)

## Decorators
This package relies heavily on decorators as it's primary mechanism for code creation/insertion.

The decorators included in this framework include:
- [`@Controller`](#controllers-controller)
- [`@GET`](#http-get-routes-get)
- [`@POST`](#http-post-routes-post)
- [`@Page`](#easy-page-rendering-page)
- [`@ChildController`]()

### Controllers (`@Controller`)
To understand what the `@Controller` does you need to understand the automated controller detection done within the `Router` class/object. More specifically, all controllers should be subclasses of the `BaseController` which has an abstract `setup` method that is called when a controller is detected to setup it's route callbacks for the app (that is, telling the app what to do when a particular endpoint/route is hit).

However, controller/application developers don't need to worry about implementing this `setup` method because of this decorator which automatically generates the `setup` method which adds routes based on the class' use of the `@GET` and `@POST` decorators.

### HTTP GET Routes (`@GET`)
As briefly explained in the [`@Controller` section](#controllers-controller) this decorator assists in the automated creation of the `setup` method for the controller. Which sets up the routes in the app. In particular, the automation within the `@Controller.setup` method translates any method with the `@GET` decorator into an `app.get` call (where `app` is the Express app) with the decorated method as the callback.

Note, the singular parameter for this decorator is a string denoting the route where the decorated method will be used as the callback.

In other words, the following two code snippets are equivalent:

```typescript
@Controller()
export class HomeRoutes extends BaseController {
    @GET('/')
    page(req: Request, res: Response) {
        ...
    }
}
```

```typescript
export class HomeRoutes {
    page(req: Request, res: Response) {
        ...
    }

    static setup(app: Express.Application) {
        const homeRoutes = new HomeRoutes();
        app.get('/', homeRoutes.page.bind(homeRoutes));
    }
}
```

### HTTP POST Routes (`@POST`)
As briefly explained in the [`@Controller` section](#controllers-controller) this decorator assists in the automated creation of the `setup` method for the controller. Which sets up the routes in the app. In particular, the automation within the `@Controller.setup` method translates any method with the `@POST` decorator into an `app.post` call (on the Express app) with the decorated method as the callback.

Unlike the `@GET` decorator This decorator takes anywhere from one to an unconstrained number of parameters. The first parameter is the string endpoint/route at which the method will be called. The parameters after that are middleware to apply to the request in addition to globally configured middleware. This is largely to compensate for needed request/body processing before the decorated method can handle the request.

In other words, the following two code snippets are equivalent:

```typescript
@Controller()
export class FormRoutes extends BaseController {
    @POST('/form/submit', express.json())
    formSubmission(req: Request, res: Response) {
        ...
    }
}
```

```typescript
export class FormRoutes {
    formSubmission(req: Request, res: Response) {
        ...
    }

    static setup(app: Express.Application) {
        const formRoutes = new FormRoutes();
        app.post('/form/submit', express.json(), formRoutes.page.bind(formRoutes));
    }
}
```

### Easy Page Rendering (`@Page`)
A very common pattern particularly for GET requests but also POST requests from time to time is to render a page as a result/response of the request. This can be automated in small ways particularly if we make a few assumptions that seem to be true across numerous projects.

The assumptions:
- Use EJS as the templating engine (in theory this is a pretty soft requirement but is what it works with currently)
- Have a `base.ejs` that contains a `<%- include(page) %>` snippet (also including stuff for `extraScripts`, `extraStyles` and `title` is highly recommended as these are common, in existing not in content, on most pages - see [`BaseTemplateCreator`](./src/BaseTemplateCreator.ts) as a guide)

In other words, the following two code snippets are equivalent:

```typescript
@Controller()
export class HomeRoutes extends BaseController {
    @Page('Home', 'home.ejs', ['some-interactive-component'], ['extra-styles'])
    @GET('/')
    page(req: Request, res: Response) {}
}
```

```typescript
export class HomeRoutes {
    page(req: Request, res: Response) {
        res.render('base', {
            page: 'home.ejs',
            title: 'Home',
            extraScripts: ['js/some-interactive-component.js'],
            extraStyles: ['css/extra-styles.css']
        });
    }

    static setup(app: Express.Application) {
        const homeRoutes = new HomeRoutes();
        app.get('/', homeRoutes.page.bind(homeRoutes));
    }
}
```

Granted, there are some intricacies around in the decorator and `base.ejs` we try to simplify the `extraScripts` and `extraStyles` so that you don't have to know the folder and file extensions etc... so that it's that little bit simpler but you get the idea.

There is also a layer of complexity if this callback has a return. It should be either:
- a boolean - if to render or not 
- an object - any additional render parameters for the template