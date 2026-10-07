import multer from 'multer';
import type { RequestHandler } from 'express';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { HttpError } from './errors.js';
let active = 0;
export function upload(field: string, maxBytes = 5 * 1024 * 1024): RequestHandler {
    const parser = multer({ storage: multer.diskStorage({ destination: tmpdir(), filename: (_req, _file, cb) => cb(null, `ltc-upload-${randomUUID()}`) }), limits: { fileSize: maxBytes, files: 1, fields: 20, fieldSize: 20000, parts: 21 } }).single(field);
    return (req, res, next) => {
        if (active >= 4) {
            next(new HttpError(503, 'Uploads are busy. Try again shortly.'));
            return;
        }
        active++;
        let released = false;
        const finish = () => { if (!released) { released = true; active--; } if (req.file)
            void unlink(req.file.path).catch(() => { }); };
        req.once('aborted', finish);
        res.once('finish', finish);
        res.once('close', finish);
        parser(req, res, error => { if (error) {
            finish();
            next(new HttpError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422, error.code === 'LIMIT_FILE_SIZE' ? 'Upload too large' : 'Invalid multipart upload'));
        }
        else if (res.destroyed) finish();
        else
            next(); });
    };
}
export function imageExtension(type: string, data: Buffer) {
    const signatures: Record<string, boolean> = { 'image/jpeg': data.subarray(0, 3).equals(Buffer.from([255, 216, 255])), 'image/png': data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/webp': data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP' };
    if (!(type in signatures))
        throw new HttpError(400, 'Only JPEG, PNG and WebP images are allowed');
    if (!signatures[type])
        throw new HttpError(400, 'Image content does not match its MIME type');
    return { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type]!;
}
export async function imageFile(file: Express.Multer.File | undefined) { if (!file)
    return null; const bytes = await readFile(file.path); return { bytes, extension: imageExtension(file.mimetype, bytes), type: file.mimetype }; }
export function safeFilename(name: string) { return name.split(/[\\/]/).pop()!.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 150) || 'attachment'; }
