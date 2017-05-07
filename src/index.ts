import jimp = require('jimp');

function imgurl(x: number, y: number, z: number): string {
    return `https://tiles.simon-dreher.de/${z}/${x}/${y}.png`;
}

type Bounds = [number, number]; 

const tilesize = 256;
const zoomlvl = 15;
const horizontal: Bounds = [17139, 17157];
const vertical: Bounds = [11242, 11259];

const width = horizontal[1] - horizontal[0] + 1;
const height = vertical[1] - vertical[0] + 1;

function percent(x: number, y: number): number {
    const percentPerX = 100.0 / width;

    return x * percentPerX + (y / height) * percentPerX;
}

async function run()
{

    const image = new jimp(width * tilesize, height * tilesize);
    
    for(var x = horizontal[0]; x <= horizontal[1]; ++x) {
        for(var y = vertical[0]; y <= vertical[1]; ++y) {
            const gridx = x - horizontal[0];
            const gridy = y - vertical[0];
            const imgsrc = imgurl(x, y, zoomlvl);
            const tile = await jimp.read(imgsrc);
            image.blit(tile, gridx * tilesize, gridy * tilesize);
            console.log(`${percent(gridx, gridy).toFixed(1)}% - ${imgsrc}`)
        }
    }


    image.write("out.png", () => {
        process.exit(0);
    });
}

run();
