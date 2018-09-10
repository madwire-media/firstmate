import * as fs from 'fs';
import * as rimraf from 'rimraf';
import { promisify } from 'util';

import { copyFiles, generateMountsScript, uncopyFiles } from './mount';

describe('copyFiles mounting', () => {
    if (!fs.existsSync('tmp')) {
        fs.mkdirSync('tmp');
    }

    afterEach(() => Promise.all(
        fs.readdirSync('tmp').map((dir) => `tmp/${dir}`)
            .concat(fs.readdirSync('.fm').map((dir) => `.fm/${dir}`))
            .map((dir) => promisify(rimraf)(dir)),
        ),
    );

    test('basic copy file', async () => {
        // Setup
        const src = 'tmp/basic-copy.txt';
        const dest = 'tmp/basic-copy.copied.txt';
        const content = 'What are you trying to tell me? That I can dodge bullets?';

        fs.writeFileSync(src, content);

        // Test setup
        expect(fs.existsSync(src)).toBe(true);
        expect(fs.readFileSync(src, 'utf8')).toBe(content);

        // Run copy
        const paths = {};
        paths[src] = dest;

        const copyResult = await copyFiles(paths, '..');

        // Test copy results
        expect(copyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(dest, 'utf8')).toBe(content);

        // Run uncopy
        const uncopyResult = await uncopyFiles();

        // Test uncopy results
        expect(uncopyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(false);

        expect(fs.readdirSync('.fm')).toEqual([]);
    });

    test('basic copy dir', async () => {
        // Setup
        const src = 'tmp/basic-copy';
        const dest = 'tmp/basic-copy.copied';
        const content = "No, Neo. I'm trying to tell you that when you're ready, you won't have to.";

        fs.mkdirSync(src);
        fs.writeFileSync(`${src}/data.txt`, content);

        // Test setup
        expect(fs.existsSync(`${src}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${src}/data.txt`, 'utf8')).toBe(content);

        // Run copy
        const paths = {};
        paths[src] = dest;

        const copyResult = await copyFiles(paths, '..');

        // Test copy results
        expect(copyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.statSync(dest).isDirectory()).toBe(true);
        expect(fs.existsSync(`${dest}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${dest}/data.txt`, 'utf8')).toBe(content);

        // Run uncopy
        const uncopyResult = await uncopyFiles();

        // Test uncopy results
        expect(uncopyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(false);

        expect(fs.readdirSync('.fm')).toEqual([]);
    });

    test('copy file over file', async () => {
        // Setup
        const src = 'tmp/basic-copy.txt';
        const dest = 'tmp/basic-copy.copied.txt';
        const origContent = "I imagine that right now, you're feeling a bit like Alice. " +
            'Hmm? Tumbling down the rabbit hole?';
        const newContent = 'You could say that.';

        fs.writeFileSync(dest, origContent);

        fs.writeFileSync(src, newContent);

        // Test setup
        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(dest, 'utf8')).toBe(origContent);

        expect(fs.existsSync(src)).toBe(true);
        expect(fs.readFileSync(src, 'utf8')).toBe(newContent);

        // Run copy
        const paths = {};
        paths[src] = dest;

        const copyResult = await copyFiles(paths, '..');

        // Test copy results
        expect(copyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(dest, 'utf8')).toBe(newContent);

        // Run uncopy
        const uncopyResult = await uncopyFiles();

        // Test uncopy results
        expect(uncopyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(dest, 'utf8')).toBe(origContent);

        expect(fs.readdirSync('.fm')).toEqual([]);
    });

    test('copy dir over dir', async () => {
        // Setup
        const src = 'tmp/basic-copy';
        const dest = 'tmp/basic-copy.copied';
        const origContent = 'I see it in your eyes. You have the look of a man who accepts what he sees ' +
            'because he is expecting to wake up.';
        const newContent = "Ironically, that's not far from the truth. Do you believe in fate, Neo?";

        fs.mkdirSync(dest);
        fs.writeFileSync(`${dest}/data.txt`, origContent);

        fs.mkdirSync(src);
        fs.writeFileSync(`${src}/data.txt`, newContent);

        // Test setup
        expect(fs.existsSync(`${dest}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${dest}/data.txt`, 'utf8')).toBe(origContent);

        expect(fs.existsSync(`${src}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${src}/data.txt`, 'utf8')).toBe(newContent);

        // Run copy
        const paths = {};
        paths[src] = dest;

        const copyResult = await copyFiles(paths, '..');

        // Test copy results
        expect(copyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.statSync(dest).isDirectory()).toBe(true);
        expect(fs.existsSync(`${dest}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${dest}/data.txt`, 'utf8')).toBe(newContent);

        // Run uncopy
        const uncopyResult = await uncopyFiles();

        // Test uncopy results
        expect(uncopyResult).toBe(true);

        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(`${dest}/data.txt`, 'utf8')).toBe(origContent);

        expect(fs.readdirSync('.fm')).toEqual([]);
    });

    test('copy file into copied dir', async () => {
        // Setup
        const src1 = 'tmp/basic-copy';
        const dest1 = 'tmp/basic-copy.copied';
        const content1 = "I know *exactly* what you mean. Let me tell you why you're here. " +
            "You're here because you know something.";
        const src2 = 'tmp/copy-into.txt';
        const dest2 = `${dest1}/copy-into.txt`;
        const content2 = "What you know you can't explain, but you feel it.";

        fs.mkdirSync(src1);
        fs.writeFileSync(`${src1}/data.txt`, content1);

        fs.writeFileSync(src2, content2);

        // Test setup
        expect(fs.existsSync(`${src1}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${src1}/data.txt`, 'utf8')).toBe(content1);

        expect(fs.existsSync(src2)).toBe(true);
        expect(fs.readFileSync(src2, 'utf8')).toBe(content2);

        // Run copy
        const paths = {};
        paths[src1] = dest1;
        paths[src2] = dest2;

        const copyResult = await copyFiles(paths, '..');

        // Test copy results
        expect(copyResult).toBe(true);

        expect(fs.existsSync(dest1)).toBe(true);
        expect(fs.statSync(dest1).isDirectory()).toBe(true);
        expect(fs.existsSync(`${dest1}/data.txt`)).toBe(true);
        expect(fs.readFileSync(`${dest1}/data.txt`, 'utf8')).toBe(content1);

        expect(fs.existsSync(dest2)).toBe(true);
        expect(fs.readFileSync(dest2, 'utf8')).toBe(content2);

        // Run uncopy
        const uncopyResult = await uncopyFiles();

        // Test uncopy results
        expect(uncopyResult).toBe(true);

        expect(fs.existsSync(dest1)).toBe(false);

        expect(fs.existsSync(dest2)).toBe(false);

        expect(fs.readdirSync('.fm')).toEqual([]);
    });
});

describe('mount script generation', () => {
    afterEach(() => Promise.all(
        fs.readdirSync('tmp').map((dir) => `tmp/${dir}`)
            .concat(fs.readdirSync('.fm').map((dir) => `.fm/${dir}`))
            .map((dir) => promisify(rimraf)(dir)),
        ),
    );

    test('works', () => {
        const service = 'myservice';
        const container = 'mycontainer';
        const k8sVolumes = {
            '/to': '/from',
            '/to2': '/from2',
        };
        const command = 'sleep infinity';

        generateMountsScript(service, container, k8sVolumes, command);

        expect(fs.existsSync(`.fm/${service}.${container}.bootstrap.sh`)).toBe(true);
        expect(fs.readFileSync(`.fm/${service}.${container}.bootstrap.sh`, 'utf8')).toBe(
`\
#!/bin/sh
ln -s /from /to
ln -s /from2 /to2
exec sleep infinity\
`,
        );
    });

    test('generates .fm dir', () => {
        if (fs.existsSync('.fm')) {
            if (fs.statSync('.fm').isDirectory()) {
                fs.rmdirSync('.fm');
            } else {
                fs.unlinkSync('.fm');
            }
        }

        const service = 'myservice';
        const container = 'mycontainer';
        const k8sVolumes = {
            '/to': '/from',
            '/to2': '/from2',
        };
        const command = 'sleep infinity';

        generateMountsScript(service, container, k8sVolumes, command);

        expect(fs.existsSync('.fm'));
        expect(fs.statSync('.fm').isDirectory()).toBe(true);
        expect(fs.existsSync(`.fm/${service}.${container}.bootstrap.sh`)).toBe(true);
        expect(fs.readFileSync(`.fm/${service}.${container}.bootstrap.sh`, 'utf8')).toBe(
`\
#!/bin/sh
ln -s /from /to
ln -s /from2 /to2
exec sleep infinity\
`,
        );
    });

    test('dirifies .fm', () => {
        if (fs.existsSync('.fm')) {
            if (fs.statSync('.fm').isDirectory()) {
                fs.rmdirSync('.fm');
            } else {
                fs.unlinkSync('.fm');
            }
        }
        fs.writeFileSync('.fm', 'delete me');

        const service = 'myservice';
        const container = 'mycontainer';
        const k8sVolumes = {
            '/to': '/from',
            '/to2': '/from2',
        };
        const command = 'sleep infinity';

        generateMountsScript(service, container, k8sVolumes, command);

        expect(fs.existsSync('.fm'));
        expect(fs.statSync('.fm').isDirectory()).toBe(true);
        expect(fs.existsSync(`.fm/${service}.${container}.bootstrap.sh`)).toBe(true);
        expect(fs.readFileSync(`.fm/${service}.${container}.bootstrap.sh`, 'utf8')).toBe(
`\
#!/bin/sh
ln -s /from /to
ln -s /from2 /to2
exec sleep infinity\
`,
        );
    });
});
