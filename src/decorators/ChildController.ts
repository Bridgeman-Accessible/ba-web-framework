import { BaseController } from '../controllers/BaseController';

export const CHILD_CONTROLLER_METADATA_KEY = 'ChildController';

export function ChildController<T extends { new(...args: any[]): {} }>(childController: BaseController | BaseController[]) {
    return function (target: T) {
        // Define a metadata key for the child controller
        Reflect.defineMetadata(CHILD_CONTROLLER_METADATA_KEY, childController, target);
    };
}