# Installing Terraform on Linux

## Quick Install Options

### Option 1: Snap (Easiest)

```bash
sudo snap install terraform --classic
```

**Note**: The `--classic` flag is required because Terraform needs full system access.

### Option 2: Official HashiCorp Repository (Recommended)

This is the official method and keeps Terraform up to date:

```bash
# Install prerequisites
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common

# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

# Add repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install
sudo apt update
sudo apt install terraform

# Verify installation
terraform version
```

### Option 3: Direct Download (Manual)

```bash
# Download latest version
TERRAFORM_VERSION=$(curl -s https://api.github.com/repos/hashicorp/terraform/releases/latest | grep tag_name | cut -d '"' -f 4 | sed 's/v//')
wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Extract
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Move to system path
sudo mv terraform /usr/local/bin/

# Verify
terraform version

# Cleanup
rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip
```

### Option 4: Using tfenv (Version Manager)

Useful if you need multiple Terraform versions:

```bash
# Install tfenv
git clone https://github.com/tfutils/tfenv.git ~/.tfenv

# Add to PATH
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install latest Terraform
tfenv install latest
tfenv use latest

# Verify
terraform version
```

## Verify Installation

After installation, verify it works:

```bash
terraform version
```

Expected output:
```
Terraform v1.6.0
on linux_amd64
```

## Next Steps

1. **Install Azure CLI** (if not already installed):
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   az login
   ```

2. **Verify Azure CLI**:
   ```bash
   az account show
   ```

3. **Initialize Terraform**:
   ```bash
   cd infrastructure/terraform
   terraform init
   ```

## Troubleshooting

### Issue: "terraform: command not found"

**Solution**: Add Terraform to PATH or use full path:
```bash
# Check where Terraform was installed
which terraform

# If using snap, it should be in /snap/bin
export PATH="/snap/bin:$PATH"
```

### Issue: "Permission denied"

**Solution**: Make sure Terraform is executable:
```bash
chmod +x /usr/local/bin/terraform
# or
sudo chmod +x /usr/local/bin/terraform
```

### Issue: "Version mismatch"

**Solution**: Update Terraform:
```bash
# Snap
sudo snap refresh terraform

# APT
sudo apt update && sudo apt upgrade terraform

# tfenv
tfenv install latest && tfenv use latest
```

## Recommended Setup

For this project, we recommend:

1. **Install via HashiCorp repository** (Option 2) - Most reliable
2. **Or use snap with --classic** (Option 1) - Quickest

Both methods will work fine for testing and deploying the infrastructure.



