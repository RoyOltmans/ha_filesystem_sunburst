import os
import json
import logging

# Load configuration
CONFIG_FILE = "config.json"  # Adjust path as needed
with open(CONFIG_FILE, "r") as config_file:
    config = json.load(config_file)

OUTPUT_FILE = config["output_file"]
ERROR_LOG_FILE = config["error_log_file"]
EXCLUDE_DIRS = config["exclude_dirs"]
MAX_DEPTH = config["max_depth"]

# Configure logging
logging.basicConfig(
    filename=ERROR_LOG_FILE,
    level=logging.ERROR,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

def calculate_folder_size(path):
    """Calculate the size of a folder."""
    total_size = 0
    try:
        for dirpath, _, filenames in os.walk(path, followlinks=False):
            for fname in filenames:
                filepath = os.path.join(dirpath, fname)
                try:
                    total_size += os.path.getsize(filepath)
                except (PermissionError, OSError):
                    logging.warning(f"Could not access file size: {filepath}")
    except (PermissionError, OSError):
        logging.error(f"Error accessing {path}")
    return total_size

def traverse_directory(root_path, max_depth):
    """Traverse directory structure up to a max depth and generate Sunburst chart data."""
    labels = []
    parents = []
    values = []
    unique_paths = set()

    def process_directory(path, parent_name, depth):
        if depth > max_depth or path in EXCLUDE_DIRS:
            return 0  # Stop traversal for excluded paths or beyond max depth

        try:
            total_size = 0
            for entry in os.scandir(path):
                if entry.is_symlink():
                    continue
                entry_path = os.path.realpath(entry.path)

                # Create a unique label for each directory
                unique_label = os.path.basename(entry.name)  # Use only the base folder name
                if unique_label in unique_paths:
                    continue  # Skip duplicates

                unique_paths.add(unique_label)

                if entry.is_dir():
                    entry_size = process_directory(entry_path, unique_label, depth + 1)
                    labels.append(unique_label)
                    parents.append(parent_name)
                    values.append(entry_size)
                    total_size += entry_size
                elif entry.is_file():
                    file_size = entry.stat().st_size
                    total_size += file_size
            return total_size
        except (PermissionError, OSError) as e:
            logging.error(f"Error accessing {path}: {e}")
            return 0

    root_size = process_directory(root_path, "Root", 0)
    labels.insert(0, "Root")
    parents.insert(0, "")
    values.insert(0, root_size)
    return {"labels": labels, "parents": parents, "values": values}

if __name__ == "__main__":
    root_directory = "/"  # Set root directory
    try:
        print(f"Starting directory scan at {root_directory}")
        data = traverse_directory(root_directory, MAX_DEPTH)  # Use max depth from config
        with open(OUTPUT_FILE, "w") as f:
            json.dump(data, f, indent=4)
        print(f"Filesystem data written to {OUTPUT_FILE}")
    except Exception as e:
        logging.critical(f"Critical error during execution: {e}")
