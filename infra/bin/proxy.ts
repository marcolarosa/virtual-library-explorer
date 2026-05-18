#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ProxyStack } from "../lib/proxy-stack";

const app = new cdk.App();

new ProxyStack(app, "LibraryExplorerProxyStack", {
    env: {
        region: process.env.AWS_REGION || "us-east-1",
    },
});

app.synth();
