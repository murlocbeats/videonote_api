import express from 'express';
import fetch from 'node-fetch';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import fileType from 'file-type'; // وارد کردن به‌طور صحیح

const app = express();
const ffmpeg = createFFmpeg({ log: true });

app.get('/process-video', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    try {
        console.log('Fetching video from URL:', videoUrl);
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const buffer = await response.buffer();

        console.log('Detecting file type');
        const type = await fileType.buffer(buffer); // تغییر به .buffer
        if (!type || type.mime !== 'video/mp4') {
            return res.status(400).send('Only MP4 videos are supported');
        }

        console.log('Loading ffmpeg');
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }

        const inputPath = 'input.mp4';
        const outputPath = 'output.mp4';

        console.log('Writing file to ffmpeg virtual file system');
        ffmpeg.FS('writeFile', inputPath, await fetchFile(buffer));

        console.log('Running ffmpeg command');
        await ffmpeg.run(
            '-i', inputPath,
            '-ss', '00:00:00',
            '-t', '10',
            '-vf', 'scale=360:360',
            outputPath
        );

        console.log('Reading output file from ffmpeg virtual file system');
        const data = ffmpeg.FS('readFile', outputPath);

        console.log('Sending output file');
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'attachment; filename="output.mp4"');
        res.send(Buffer.from(data));

        console.log('Cleaning up temporary files');
        ffmpeg.FS('unlink', inputPath);
        ffmpeg.FS('unlink', outputPath);

    } catch (error) {
        console.error('Error processing video:', error.message);
        res.status(500).send('Error processing video');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
