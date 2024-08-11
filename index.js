const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Endpoint برای پردازش ویدیو
app.get('/process-video', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    try {
        const videoPath = path.resolve(__dirname, 'input.mp4');
        const outputPath = path.resolve(__dirname, 'output.mp4');

        // دانلود ویدیو با مدیریت خطاها
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            validateStatus: function (status) {
                return status >= 200 && status < 400; // موفقیت‌آمیز بودن درخواست
            }
        });

        // ذخیره ویدیو در فایل input.mp4
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            // پردازش ویدیو با استفاده از FFmpeg
            ffmpeg(videoPath)
                .setStartTime('00:00:00')
                .setDuration(10)
                .size('360x360')
                .output(outputPath)
                .on('end', () => {
                    // ارسال ویدیو پردازش‌شده به کاربر
                    res.download(outputPath, 'output.mp4', (err) => {
                        if (err) {
                            console.error(err);
                        }

                        // حذف فایل‌های موقت
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(outputPath);
                    });
                })
                .on('error', (err) => {
                    console.error(err);
                    res.status(500).send('Error processing video');
                })
                .run();
        });

        writer.on('error', (err) => {
            console.error(err);
            res.status(500).send('Error downloading video');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
