# Vendor Directory

This directory contains PHPWord and its dependencies.

## Installation

Run the setup script from the plugin root directory:

```bash
cd /path/to/moodle/local/customgradeexport
./setup_vendor.sh
```

Or manually clone the repositories:

```bash
cd vendor

# Clone PHPWord
mkdir -p phpoffice
git clone --depth 1 --branch 1.2.0 https://github.com/PHPOffice/PHPWord.git phpoffice/phpword

# Clone Laminas Escaper  
mkdir -p laminas
git clone --depth 1 --branch 2.13.0 https://github.com/laminas/laminas-escaper.git laminas/laminas-escaper
```

## Expected Structure

```
vendor/
├── autoload.php           (included in plugin)
├── phpoffice/
│   └── phpword/           (git clone)
└── laminas/
    └── laminas-escaper/   (git clone)
```

## Verification

Check that PHPWord is installed:

```bash
ls -la phpoffice/phpword/src/PhpWord/
ls -la laminas/laminas-escaper/src/
```

Both directories should contain PHP source files.
