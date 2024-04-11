#!/bin/sh
set -e
set -o noglob

# Usage:
#   curl ... | ENV_VAR=... sh -
#       or
#   ENV_VAR=... ./install.sh
#
# Example:
#   Installing a jcli with assigned version:
#     curl ... | INSTALL_JCLI_VERSION="0.1.0" sh -
#
# Environment variables:
#   - INSTALL_JCLI_VERSION
#     Version of JCLI to download from github. Will attempt to download from the
#     stable channel if not specified.
#
#   - INSTALL_JCLI_BIN_DIR
#     Directory to install JCLI binary, links, and uninstall script to, or use
#     /usr/local/bin as the default
#
#   - INSTALL_JCLI_CHANNEL_URL
#     Channel URL for fetching jcli download URL.
#     Defaults to 'https://github.com/Byzanteam/jcli/releases'.
#
#   - INSTALL_JCLI_CHANNEL
#     Channel to use for fetching jcli download URL.
#     Defaults to 'latest'.

GITHUB_URL=https://github.com/Byzanteam/jcli/releases
DOWNLOADER=

# --- helper functions for logs ---
info()
{
    echo '[INFO] ' "$@"
}
warn()
{
    echo '[WARN] ' "$@" >&2
}
fatal()
{
    echo '[ERROR] ' "$@" >&2
    exit 1
}

# --- set arch, fatal if architecture not supported ---
setup_verify_arch() {
    if [ -z "$ARCH" ]; then
        ARCH=$(uname -m)
    fi
    case $ARCH in
        amd64)
            ARCH=x86_64
            ;;
        x86_64)
            ARCH=x86_64
            ;;
        arm64)
            ARCH=aarch64
            ;;
        aarch64)
            ARCH=aarch64
            ;;
        *)
            fatal "Unsupported architecture $ARCH"
    esac
}

# --- set os and suffix, fatal if operating system not supported ---
setup_verify_os() {
    if [ -z "$OS" ]; then
        OS=$(uname)
    fi
    case $OS in
        Linux)
            OS=linux
            SUFFIX=$ARCH-unknown-$OS-gnu
            ;;
        Darwin)
            OS=darwin
            SUFFIX=$ARCH-apple-$OS
            ;;
        *)
            fatal "Unsupported operating system $OS"
    esac
}

# --- define needed environment variables ---
setup_env() {
	  # --- use sudo if we are not already root ---
    SUDO=sudo
    if [ $(id -u) -eq 0 ]; then
        SUDO=
    fi

    # --- use binary install directory if defined or create default ---
    if [ -n "${INSTALL_JCLI_BIN_DIR}" ]; then
        BIN_DIR=${INSTALL_JCLI_BIN_DIR}
    else
        # --- use /usr/local/bin if root can write to it, otherwise use /opt/bin if it exists
        BIN_DIR=/usr/local/bin
        if ! $SUDO sh -c "touch ${BIN_DIR}/jcli-ro-test && rm -rf ${BIN_DIR}/jcli-ro-test"; then
            if [ -d /opt/bin ]; then
                BIN_DIR=/opt/bin
            fi
        fi
    fi

    # --- set related files name ---
    UNINSTALL_JCLI_SH=${UNINSTALL_JCLI_SH:-${BIN_DIR}/jcli-uninstall.sh}

    # --- setup channel values
    INSTALL_JCLI_CHANNEL_URL=${INSTALL_JCLI_CHANNEL_URL:-'https://github.com/Byzanteam/jcli/releases'}
    INSTALL_JCLI_CHANNEL=${INSTALL_JCLI_CHANNEL:-'latest'}

    # --- setup config file name
    FILE_JCLI_CONFIG_DIRECTORY="$HOME/.config/jcli"

}

# --- verify existence of network downloader executable ---
verify_downloader() {
    # Return failure if it doesn't exist or is no executable
    [ -x "$(command -v $1)" ] || return 1

    # Set verified executable as our downloader program and return success
    DOWNLOADER=$1
    return 0
}

# --- create temporary directory and cleanup when done ---
setup_tmp() {
    TMP_DIR=$(mktemp -d -t jcli-install.XXXXXXXXXX)
    TMP_BIN=$TMP_DIR/jcli
    cleanup() {
        code=$?
        set +e
        trap - EXIT
        rm -rf ${TMP_DIR}
        exit $code
    }
    trap cleanup INT EXIT
}

# --- use desired jcli version if defined or find version from channel ---
get_release_version() {
    if [ -n "${INSTALL_JCLI_VERSION}" ]; then
        VERSION_JCLI=${INSTALL_JCLI_VERSION}
    else
        info "Finding release for channel ${INSTALL_JCLI_CHANNEL}"
        version_url="${INSTALL_JCLI_CHANNEL_URL}/${INSTALL_JCLI_CHANNEL}"
        case $DOWNLOADER in
            curl)
                VERSION_JCLI=$(curl -w '%{url_effective}' -L -s -S ${version_url} -o /dev/null | sed -e 's|.*/||')
                ;;
            wget)
                VERSION_JCLI=$(wget -SqO /dev/null ${version_url} 2>&1 | grep -i Location | sed -e 's|.*/||')
                ;;
            *)
                fatal "Incorrect downloader executable '$DOWNLOADER'"
                ;;
        esac
    fi
    info "Using ${VERSION_JCLI} as release"
}

# --- download from github url ---
download() {
    [ $# -eq 2 ] || fatal 'download needs exactly 2 arguments'
    set +e
    case $DOWNLOADER in
        curl)
            curl -o $1 -sfL $2
            ;;
        wget)
            wget -qO $1 $2
            ;;
        *)
            fatal "Incorrect executable '$DOWNLOADER'"
            ;;
    esac

    # Abort if download command failed
    [ $? -eq 0 ] || fatal 'Download failed'
    set -e
}

# --- download binary from github url ---
download_binary() {
    BIN_URL=${GITHUB_URL}/download/${VERSION_JCLI}/jcli-${SUFFIX}
    info "Downloading binary ${BIN_URL}"
    download ${TMP_BIN} ${BIN_URL}
}

# --- setup permissions and move binary to system directory ---
setup_binary() {
    chmod 755 ${TMP_BIN}
    info "Installing jcli to ${BIN_DIR}/jcli"
    chown $(id -u) ${TMP_BIN}
    $SUDO mv -f ${TMP_BIN} ${BIN_DIR}
}

# --- download and verify jcli ---
download_and_verify() {
    setup_verify_arch
    setup_verify_os
    verify_downloader curl || verify_downloader wget || fatal 'Can not find curl or wget for downloading files'
    setup_tmp
    get_release_version

    download_binary
    setup_binary
}

# --- create uninstall script ---
create_uninstall() {
    info "Creating uninstall script ${UNINSTALL_JCLI_SH}"
    $SUDO tee ${UNINSTALL_JCLI_SH} >/dev/null << EOF
#!/bin/sh
set -x

rm -rf ${FILE_JCLI_CONFIG_DIRECTORY}

remove_uninstall() {
    $SUDO rm -f ${UNINSTALL_JCLI_SH}
}
trap remove_uninstall EXIT

$SUDO rm -f ${BIN_DIR}/jcli
EOF
    $SUDO chmod 755 ${UNINSTALL_JCLI_SH}
    $SUDO chown $(id -u) ${UNINSTALL_JCLI_SH}
}

# --- create jcli config file ---
create_config_file() {
   if [ -f $FILE_JCLI_CONFIG_DIRECTORY/config.json ]; then
       info "The jcli config file already exist!"
   else
       info "config: Creating config file ${FILE_JCLI_CONFIG_DIRECTORY}"
       mkdir -p ${FILE_JCLI_CONFIG_DIRECTORY}
       touch ${FILE_JCLI_CONFIG_DIRECTORY}/config.json
       tee ${FILE_JCLI_CONFIG_DIRECTORY}/config.json > /dev/null << EOF
{
  "$schema": "https://cdn.jsdelivr.net/gh/Byzanteam/jcli/schemas/jcli-config.json"
}
EOF
        chmod 700 ${FILE_JCLI_CONFIG_DIRECTORY}
        chmod 600 ${FILE_JCLI_CONFIG_DIRECTORY}/config.json
    fi
}

# --- run the install process --
{
    setup_env "$@"
    download_and_verify
    create_uninstall
    create_config_file
}
