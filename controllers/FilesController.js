/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { Request, Response } from 'express';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import { getUserFromXToken } from '../utils/auth';

const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};

const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);
const MAX_FILES_PER_PAGE = parseInt(process.env.MAX_FILES_PER_PAGE || '20', 10);
const fileQueue = new Queue('thumbnail generation');
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');

/**
 * Validates if the given ID is a valid MongoDB ObjectId.
 * @param {string} id - The ID to validate.
 * @returns {boolean}
 */
const isValidId = (id) => {
  const size = 24;
  const charRanges = [[48, 57], [97, 102], [65, 70]];
  if (typeof id !== 'string' || id.length !== size) return false;
  return Array.from(id).every((char) => charRanges.some(([min, max]) => char.charCodeAt(0) >= min && char.charCodeAt(0) <= max));
};

export default class FilesController {
  /**
   * Uploads a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async postUpload(req, res) {
    try {
      const { user } = req;
      const name = req.body?.name || null;
      const type = req.body?.type || null;
      const parentId = req.body?.parentId || ROOT_FOLDER_ID;
      const isPublic = req.body?.isPublic || false;
      const base64Data = req.body?.data || '';

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
        return res.status(400).json({ error: 'Missing or invalid type' });
      }
      if (type !== VALID_FILE_TYPES.folder && !base64Data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      const userId = user._id.toString();
      const baseDir = process.env.FOLDER_PATH || joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

      const parentFile = await FilesController._getParentFile(parentId, userId);
      if (parentFile && parentFile.type !== VALID_FILE_TYPES.folder) {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }

      const newFile = {
        userId: new mongoDBCore.BSON.ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === ROOT_FOLDER_ID ? '0' : new mongoDBCore.BSON.ObjectId(parentId),
      };

      await mkDirAsync(baseDir, { recursive: true });

      if (type !== VALID_FILE_TYPES.folder) {
        const localPath = joinPath(baseDir, uuidv4());
        await writeFileAsync(localPath, Buffer.from(base64Data, 'base64'));
        newFile.localPath = localPath;
      }

      const insertionInfo = await (await dbClient.filesCollection()).insertOne(newFile);
      const fileId = insertionInfo.insertedId.toString();

      if (type === VALID_FILE_TYPES.image) {
        fileQueue.add({ userId, fileId, name: `Image thumbnail [${userId}-${fileId}]` });
      }

      res.status(201).json({
        id: fileId,
        userId,
        name,
        type,
        isPublic,
        parentId: parentId === ROOT_FOLDER_ID ? 0 : parentId,
      });
    } catch (error) {
      console.error('Error in postUpload:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves a file's metadata by ID.
   */
  static async getShow(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;
      const userId = user._id.toString();

      const file = await FilesController._findFileById(id, userId);
      if (!file) return res.status(404).json({ error: 'Not found' });

      res.status(200).json({
        id,
        userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
      });
    } catch (error) {
      console.error('Error in getShow:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Helper function to retrieve parent file.
   * @param {string} parentId
   * @param {string} userId
   * @returns {Object|null}
   */
  static async _getParentFile(parentId, userId) {
    if (parentId === ROOT_FOLDER_ID || parentId === ROOT_FOLDER_ID.toString()) return null;
    return await (await dbClient.filesCollection()).findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(userId),
    });
  }

  /**
   * Helper function to find a file by ID.
   * @param {string} id
   * @param {string} userId
   * @returns {Object|null}
   */
  static async _findFileById(id, userId) {
    return await (await dbClient.filesCollection()).findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(userId),
    });
  }
}
