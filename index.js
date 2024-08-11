import express from 'express';
import fetch from 'node-fetch'; // برای دانلود ویدیو
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import fileType from 'file-type';
import { promises as fs } from 'fs'; // استفاده از promises برای استفاده از async/await
import path from 'path';

const app = express();
const ffmpeg = createFFmpeg({ log: true });

app.get('/process-video', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    try {
        const response = await fetch(videoUrl);
        const buffer = await response.buffer();

        // بررسی نوع فایل
        const type = await fileType.fromBuffer(buffer);
        if (!type || type.mime !== 'video/mp4') {
            return res.status(400).send('Only MP4 videos are supported');
        }

        const inputPath = 'input.mp4';
        const outputPath = 'output.mp4';

        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }

        // فایل ورودی را در سیستم فایل مجازی ffmpeg کپی می‌کنیم
        ffmpeg.FS('writeFile', inputPath, await fetchFile(buffer));

        // اجرای فرمان‌های ffmpeg برای پردازش ویدیو
        await ffmpeg.run(
            '-i', inputPath,
            '-ss', '00:00:00',
            '-t', '10',
            '-vf', 'scale=360:360',
            outputPath
        );

        // دریافت ویدیو خروجی از سیستم فایل مجازی ffmpeg
        const data = ffmpeg.FS('readFile', outputPath);

        // ارسال ویدیو به صورت فایل دانلود
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename="output.mp4"');
        res.send(Buffer.from(data));

        // حذف فایل‌های موقت از سیستم فایل مجازی ffmpeg
        ffmpeg.FS('unlink', inputPath);
        ffmpeg.FS('unlink', outputPath);

    } catch (error) {
        console.error('Error processing video:', error);
        res.status(500).send('Error processing video');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
