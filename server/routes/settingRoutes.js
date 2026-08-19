import express from 'express';
import { getSetting, updateSetting } from '../controllers/settingController.js';

const router = express.Router();

router.route('/:key')
  .get(getSetting)
  .put(updateSetting);

export default router;
