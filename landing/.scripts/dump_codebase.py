import os
import difflib

# Configurable exclusions
EXCLUDED_DIRS = {
    'node_modules', '.next', '.git', '.vscode', 'dist', 'build', 'coverage', 
    '.gemini', '__pycache__', '.agents', '.agent', '.scripts', 'out'
}
EXCLUDED_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'codebase_dump.txt', 
    'codebase_dump.py', 'codebase_dump_watch.py', '.DS_Store', '.gitignore',
    'dump_codebase.py', 'skills.md'
}

# Extensions to include
INCLUDED_EXTENSIONS = {
    '.tsx', '.ts', '.db', '.js', '.json', '.css', '.html', '.py', '.md', '.sql',
    '.mjs', '.cjs', '.yaml', '.yml'
}

def is_text_file(filepath):
    """Check if a file is a text file by reading a small chunk."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except (UnicodeDecodeError, IOError):
        return False

def get_codebase_content(root_dir):
    """Walk through the root_dir and gather text file contents into a list of strings."""
    content_lines = []
    
    for root, dirs, files in os.walk(root_dir):
        # Modify dirs in-place to filter excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        for file in files:
            if file in EXCLUDED_FILES:
                continue
            
            _, ext = os.path.splitext(file)
            if ext.lower() not in INCLUDED_EXTENSIONS:
                continue
            
            filepath = os.path.join(root, file)
            
            if not is_text_file(filepath):
                continue
            
            # Make relative path for cleaner output
            rel_path = os.path.relpath(filepath, root_dir)
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    file_content = f.read()
                    
                content_lines.append(f"File: {rel_path}\n")
                content_lines.append("-" * 80 + "\n")
                content_lines.append(file_content + "\n")
                content_lines.append("=" * 80 + "\n\n")
                print(f"Dumped: {rel_path}")
            except Exception as e:
                print(f"Skipping {rel_path}: {e}")
                
    return content_lines

def dump_codebase(root_dir, output_file):
    """Walk through the root_dir, dump content to output_file."""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    new_content_chunks = get_codebase_content(root_dir)
    full_new_content = "".join(new_content_chunks)
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(full_new_content)
        
    return len(new_content_chunks), full_new_content.count('\n')

if __name__ == "__main__":
    # Get the project root directory (current directory)
    project_root = os.getcwd()
    output_path = os.path.join(project_root, 'out', 'codebase_dump.txt')
    
    print(f"Starting codebase dump from: {project_root}")
    print(f"Target output: {output_path}")
    
    files_dumped, total_lines = dump_codebase(project_root, output_path)
    
    print(f"\n{'='*40}")
    print(f"Stats: {files_dumped} files dumped, {total_lines} total lines")
    print(f"{'='*40}")
    print(f"Done! Dump available at {output_path}")
