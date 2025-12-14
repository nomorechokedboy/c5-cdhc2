#!/bin/bash

# Setup script for PHPWord vendor directory
# This script clones PHPWord and its dependencies

echo "=== Setting up PHPWord for Custom Grade Export ==="
echo ""

# Create vendor directory if it doesn't exist
mkdir -p vendor
cd vendor

# Clone PHPWord
if [ -d "phpoffice/phpword" ]; then
    echo "PHPWord already exists, skipping..."
else
    echo "Cloning PHPWord..."
    mkdir -p phpoffice
    git clone --depth 1 --branch 1.2.0 https://github.com/PHPOffice/PHPWord.git phpoffice/phpword
    echo "✓ PHPWord cloned"
fi

# Clone Laminas Escaper
if [ -d "laminas/laminas-escaper" ]; then
    echo "Laminas Escaper already exists, skipping..."
else
    echo "Cloning Laminas Escaper..."
    mkdir -p laminas
    git clone --depth 1 --branch 2.13.0 https://github.com/laminas/laminas-escaper.git laminas/laminas-escaper
    echo "✓ Laminas Escaper cloned"
fi

cd ..

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Vendor directory structure:"
tree -L 3 vendor/ 2>/dev/null || find vendor/ -maxdepth 3 -type d

echo ""
echo "Next steps:"
echo "1. Run: php admin/cli/upgrade.php"
echo "2. Run: php admin/cli/purge_caches.php"
echo "3. Test exports in Quiz/Assignment activities"
