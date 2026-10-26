#!/bin/bash
# Hook gets JSON on stdin; extract the edited file path
f=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.file_path||"")}catch(e){}})')
case "$f" in
  *.js) node --check "$f" || exit 2 ;;
esac
exit 0