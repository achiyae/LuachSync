import sharp from 'sharp';
import fs from 'fs';

async function run() {
    console.log("Processing logo...");
    // The newly generated logo with the text "LUACHSYNC Hebrew Calendar for Google"
    const genLogoPath = 'C:\\Users\\achiy\\.gemini\\antigravity\\brain\\410a0c01-02bd-4612-8e70-2c37af148447\\new_logo_1775473650546.png';

    // We create a rounded rectangle mask with sharp's SVG parsing
    const roundedCorners = Buffer.from(
        '<svg><rect x="0" y="0" width="1024" height="1024" rx="230" ry="230" /></svg>'
    );

    // This applies the rounded corners to the NEW generated logo
    const newLogoBuffer = await sharp(genLogoPath)
        .resize(1024, 1024)
        .composite([{
            input: roundedCorners,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();

    // And overwrites the logo.png with the new text + transparent rounded corners!
    fs.writeFileSync('public/logo.png', newLogoBuffer);
    console.log("Replaced logo.png with the new text and transparent corners.");

    console.log("Processing logo-small...");
    await sharp(newLogoBuffer)
        .resize({ width: 240, height: 240, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile('public/logo-small.png');

    console.log("Processing social preview...");
    const socialPath = 'public/github-social-preview.png';
    const logoResized = await sharp(newLogoBuffer)
        .resize(512, 512)
        .toBuffer();

    await sharp(socialPath)
        .composite([{ input: logoResized, gravity: 'center' }])
        .png()
        .toFile('public/github-social-preview-new.png');

    fs.renameSync('public/github-social-preview-new.png', 'public/github-social-preview.png');
    console.log("All done!");
}

run().catch(console.error);
