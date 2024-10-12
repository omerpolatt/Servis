import { Router } from 'express';
import { createProject, deleteProject , updateProjectName , listUserProjects  } from '../controllers/ProjectController';  

const router = Router();


router.post('/create', createProject);  

router.delete('/:projectId', deleteProject);  

router.patch('/:projectId', updateProjectName);  

router.get('/list', listUserProjects);  


export default router;
