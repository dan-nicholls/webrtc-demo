{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
	name = "webrtc-dev-shell";

	buildInputs = with pkgs; [
		nodePackages.nodejs
		pnpm
	];


	shellHook = ''
		export NODE_OPTIONS="--max-old-space-size=4096"
		echo "Entered webrtc-dev-shell (node $(node --version))"
	'';
}
