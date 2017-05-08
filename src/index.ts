import jimp = require('jimp');

function imgurl(x: number, y: number, z: number): string {
    //return `http://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    //return `https://tiles.simon-dreher.de/${z}/${x}/${y}.png`;
    return `http://localhost:8080/${z}/${x}/${y}.png`;
}

type Bounds = [number, number]; 

const parallelRequests = 10;
const outfile = "out.png";

/* border for the big image

const wbordersrc = "wborder.png";
const hbordersrc = "hborder.png";
const cornersrc = "corner.png";*/
const wbordersrc = "preview-wborder.png";
const hbordersrc = "preview-hborder.png";
const cornersrc = "preview-corner.png";

const tilesize = 256;

// karlsruhe zoomed in and big
/*const zoomlvl = 16;
const horizontal: Bounds = [34278, 34317];
const vertical: Bounds = [22493, 22517];*/

// karlsruhe overview
const zoomlvl = 14;
const horizontal: Bounds = [8570, 8578];
const vertical: Bounds = [5623, 5629];

//const horizontal: Bounds = [34277, 34280];
//const vertical: Bounds = [22493, 22500];

const width = horizontal[1] - horizontal[0] + 1;
const height = vertical[1] - vertical[0] + 1;


async function drawBorder(target: jimp, border: jimp, x: number, y: number, dx: number, dy: number) {
    while (x < target.bitmap.width && y < target.bitmap.height) {
        target.blit(border, x, y);
        x += dx;
        y += dy;
    }
}
export function sleep(time_ms: number) {
    return new Promise(resolve => setTimeout(resolve, time_ms));
}

async function run()
{
    const wborder = await jimp.read(wbordersrc);
    const hborder = await jimp.read(hbordersrc);
    const corner = await jimp.read(cornersrc);
    const xstart = hborder.bitmap.width;
    const ystart = wborder.bitmap.height;

    console.log(`Border is ${xstart}x${ystart}`);

    const image = new jimp(width * tilesize + xstart * 2, height * tilesize + ystart * 2);

    // draw border
    {
        console.log("Draw top border...");
        await drawBorder(image, wborder, xstart, 0, wborder.bitmap.width, 0);

        console.log("Draw bottom border...");
        await drawBorder(image, wborder, xstart, image.bitmap.height - ystart, wborder.bitmap.width, 0);

        console.log("Draw left border...");
        await drawBorder(image, hborder, 0, ystart, 0, hborder.bitmap.height);

        console.log("Draw right border...");
        await drawBorder(image, hborder, image.bitmap.width - xstart, ystart, 0, hborder.bitmap.height);

        console.log("Draw corners...");
        image.blit(corner, 0, 0);
        corner.rotate(90);
        image.blit(corner, image.bitmap.width - corner.bitmap.width, 0);
        image.blit(corner, 0, image.bitmap.height - corner.bitmap.height);
        image.blit(corner, image.bitmap.width - corner.bitmap.width, image.bitmap.height - corner.bitmap.height);
    }
    
    let gridcoords: [number, number][] = [];
    {
        let i = 0;
        for(var x = horizontal[0]; x <= horizontal[1]; ++x) {
            for(var y = vertical[0]; y <= vertical[1]; ++y) {
                gridcoords.push([x, y]);
            }
        }
    }

    console.log("Print tiles...");
    let percent = 0.0;
    let next = 0;

    let gridfuncs = gridcoords.map(([x, y]) => { return async (): Promise<void> => {
        const gridx = x - horizontal[0];
        const gridy = y - vertical[0];
        const imgsrc = imgurl(x, y, zoomlvl);
        const tile = await jimp.read(imgsrc);
        image.blit(tile, gridx * tilesize + xstart, gridy * tilesize + ystart);
        
        const percentPerX = 1.0 / (width + 1);
        const percentPerY = (1.0 / (height + 1)) * percentPerX;
        percent += percentPerY * 100.0;
        console.log(`${percent.toFixed(1)}% - ${imgsrc}`);

        return next < gridfuncs.length ? gridfuncs[next++]() : Promise.resolve();
    }});

    await Promise.all(gridfuncs.slice(0, parallelRequests).map(async f => await f()));

    console.log("100.0%");
    console.log(`Write ${outfile}`);
    image.write(outfile, () => {
        console.log("Done.");
        process.exit(0);
    });
}

run();
