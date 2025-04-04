import { createRouter } from 'next-connect';
import model from './model';
import database from './database';

const baseRouter = createRouter();

// Chain middleware
baseRouter.use(database, model);
// Add named export for baseRouter
export { baseRouter };