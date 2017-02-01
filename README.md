This tool is used to generate JSON files with the relevant documentation from Node's official docs. The scripts themselves are also heavily based on Node's tools for generating JSON files.

# To Run

1. Clone the node repository:

    ```shell
    git clone git@github.com:nodejs/node.git
    ```

2. Checkout the remote tags so we can generate documentation for the specific engines of node:

    ```shell
    cd node
    git fetch --all --tags --prune
    ```

3. Checkout the version of Node you want to generate Docs for:

    ```shell
    git checkout tags/v4.6.1
    ```

4. Clone this repository

    ```shell
    git clone git@github.com:pouwerkerk/node-docs.git
    ```

5. `npm install` its dependencies

    ```shell
    cd node-docs
    npm install
    ```

6. Run this script to generate documentation

    ```shell
    node generate-all
    ```
