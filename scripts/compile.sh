#!/bin/bash
# Runs browserify for necessary client side scripts
tocompile=("login.js")

for i in "${tocompile[@]}"
do
    browserify client/compile_javascripts/$i -o client/$i
done