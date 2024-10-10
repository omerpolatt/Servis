import { Router } from 'express';
import { createProject, deleteProject , updateProjectName , listUserProjects , getProjectById } from '../controllers/ProjectController';  

const router = Router();


router.post('/create', createProject);  

router.delete('/:bucketId', deleteProject);  


router.patch('/:bucketId', updateProjectName);  

router.get('/list', listUserProjects);  

export default router;
