/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import * as extensionTest from './extension.test';
import * as fs from 'fs';
import * as installTest from './install.test';
import * as marketplaceTest from './marketplace.test';
import * as path from 'path';
import * as webserver from '../test/app_soap';
import { expect } from 'chai';
import { DefaultWait, Project } from 'vscode-uitests-tooling';
import { projectPath } from './package_data';
import { ActivityBar, VSBrowser } from 'vscode-extension-tester';

describe('All tests', function () {
	installTest.test();
	marketplaceTest.test();

	describe('Extension tests', function() {
		this.timeout(4000);
		let browser: VSBrowser;
		let workspace: Project;

		before('Setup environment', async function() {
			this.timeout(32000);
			browser = VSBrowser.instance;
			workspace = await prepareWorkspace(browser);
			webserver.startWebService();
		});

		after('Clear environment', async function() {
			await clearWorkspace(workspace);
			webserver.stopWebService();
		});

		for (const f of walk(path.join(projectPath, 'src/ui-test/test-data'))) {
			assert(f.endsWith('.json'), `${f} is not json file`);
			const fileContent = fs.readFileSync(f, { encoding: 'utf8' });
			extensionTest.test(JSON.parse(fileContent));
		}
	});

});

/**
 * Iterates over all files which are children of `dir`.
 * @param dir starting directory
 * @returns iterable object of file absolute paths
 */
function* walk(dir: string): Iterable<string> {
	const stack = [dir];

	while (stack.length > 0) {
		const file = stack.pop();
		const stat = fs.statSync(file);

		if (stat && stat.isDirectory()) {
			// add directories and files to stack and transform filenames to absolute paths
			stack.push(...fs.readdirSync(file).map(f => path.join(file, f)));
		} else {
			yield file;
		}
	}
}

/**
 * Creates new project and opens it in vscode
 */
async function prepareWorkspace(browser: VSBrowser): Promise<Project> {
	const project = new Project(extensionTest.WORKSPACE_PATH);
	
	expect(project.exists, `Test directory (${extensionTest.WORKSPACE_PATH}) already exists. In order to run this test, delete '${extensionTest.WORKSPACE_PATH}' directory.`).to.be.false;
	project.create();
	expect(project.exists, `Could not create test directory (${extensionTest.WORKSPACE_PATH}).`).to.be.true;

	await project.open();
	
	const activityBar = new ActivityBar();
	const explorerView = await activityBar.getViewControl("Explorer").openView();
	browser.driver.wait(async function() {
		const text = await explorerView.getText();
		const folderName = extensionTest.WORKSPACE_PATH.substring(extensionTest.WORKSPACE_PATH.lastIndexOf('/') + 1);
		return text.toLowerCase().includes(folderName);
	});

	return project;
}

/**
 * Closes and deletes project
 * @param workspace project object returned from `prepareWorkspace` function
 */
async function clearWorkspace(workspace: Project): Promise<void> {
	await workspace.close();
	await workspace.delete();
}
