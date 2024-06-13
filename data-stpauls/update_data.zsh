#!/bin/zsh

# Base URL for the endpoint where JSON files are located
base_url="https://data.exploretrees.sg"

# List of JSON file names
json_files=(
	"families-species.json"
	"families.json"
	"heritage-trees.json"
	"pois.json"
	"species-info.json"
	"species.json"
	"trees-no-coords.csv.txt"
	"trees.line.txt"
	"trees.min.json"
	"trees.min.mp.ico"
)

# Loop through each JSON file name
for file in "${json_files[@]}"; do
  # Construct the full URL for the JSON file
  url="$base_url/$file"
  
  # Fetch the JSON file and save it with the same name
  curl -s $url -o $file
  
  if [[ $? -eq 0 ]]; then
    echo "Saved $file"
  else
    echo "Failed to save $file"
  fi
done
