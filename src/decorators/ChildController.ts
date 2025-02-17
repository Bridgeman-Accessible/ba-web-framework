import { BaseController } from '../controllers/BaseController';

export function ChildController<T extends { new(...args: any[]): {} }>(childController: BaseController | BaseController[]) {
    return function (target: T) {
        // Define a metadata key for the child controller
        Reflect.defineMetadata('ChildController', childController, target);
    };
}