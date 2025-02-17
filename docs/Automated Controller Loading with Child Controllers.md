# Automated Controller Loading with Child Controllers
While loading controllers automatically from a provided directory is an overall helpful feature in abbreviating the code for the end developer/user while maintaining a high level of flexibility. However, it does introduce a particular problem with child controllers.

## The Issue
The issue with a naive approach of just calling `setup` on all controllers we find in the designated directory (and it's subdirectories) is this would produce duplicate callbacks for the same route. This is because we would both call `setup` as we find the controllers but ALSO inside the `Controller` decorator for child controllers.

## The Solution Impact
However, to resolve this has meant multiple entire passes of all the found controllers which if there is a large amount of controllers could be pretty inefficient in a number of ways. 

For instance, this means that parallelization of loading is limited to the initial loading rather than calling of `setup`

Another way, our particular solution to this issue, at least currently, precludes using any kind of greedy methodology which if we could use could make the loading significantly more efficient. 

This is because we can't know that the parent controller (with the `ChildController` decorator) would be processed before any child controller is.

## The Solution
The following is the isolated code that addresses this particular issue

```typescript
// Get all controllers that have the child controller decorator
const controllersWithChildControllers = loadedControllers.filter(controller => Reflect.getMetadata('ChildController', controller) !== undefined);

// Get all those controllers that are designated as children controllers by parent controller
const childrenControllers = controllersWithChildControllers.map(controller => Reflect.getMetadata('ChildController', controller));

// Get the exclusive set of controllers that don't fit in the group of controllers with child controllers OR a child controller themselves
const controllersWithoutChildren = loadedControllers.filter(controller => !controllersWithChildControllers.includes(controller) && !childrenControllers.includes(controller));

// Take the list of controllers with child controllers and the list without children (that excludes children themselves)
// And forma a list that has all child controllers removed
const topLevelControllers = [...controllersWithChildControllers, ...controllersWithoutChildren];
```