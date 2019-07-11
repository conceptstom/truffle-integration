import { ipcRenderer } from "electron";
import { replace } from "react-router-redux";

import { setRPCProviderUrl } from "../../common/redux/web3/actions";

import {
  SET_SERVER_STARTED,
  SET_BLOCK_NUMBER,
  SET_SYSTEM_ERROR,
  SET_MODAL_ERROR,
  SET_KEY_DATA,
  getGasPrice,
  getGasLimit,
  getBlockSubscription,
  setServerStarted,
  setBlockNumber,
  setKeyData,
  setBlockNumberToLatest,
  SHOW_HOME_SCREEN,
  showHomeScreen,
} from "../../common/redux/core/actions";

import { getAccounts } from "../../common/redux/accounts/actions";

import {
  setSettings,
  setStartupMode,
  STARTUP_MODE,
} from "../../common/redux/config/actions";

import { handleError } from "./ErrorHandler";

export function initCore(store) {
  // Wait for the server to start...
  ipcRenderer.on(
    SET_SERVER_STARTED,
    (sender, globalSettings, workspaceSettings, startupMode) => {
      if (workspaceSettings.server.regtest && workspaceSettings.regtest) {
        workspaceSettings.server.hostname = workspaceSettings.regtest.hostname;
        workspaceSettings.server.port = workspaceSettings.regtest.port;
        workspaceSettings.name = workspaceSettings.regtest.name;
      }

      const suffix =
        workspaceSettings.regtest && workspaceSettings.regtest.suffix
          ? workspaceSettings.regtest.suffix
          : "";

      // Get current settings into the store
      store.dispatch(setSettings(globalSettings, workspaceSettings));

      // Ensure web3 is set
      // 0.0.0.0 doesn't work the same as it does on other platforms, so we need to replace it
      // with localhost. Note: we don't want to update the _stored_ hostname, as 0.0.0.0 a valid concept.
      const hostname = workspaceSettings.server.hostname.replace(
        "0.0.0.0",
        "localhost",
      );

      console.log("hostname", hostname);
      console.log(
        "workspaceSettings.server.port",
        workspaceSettings.server.port,
      );
      console.log("suffix", suffix);
      const url = `ws://${hostname}:${workspaceSettings.server.port}${suffix}`;

      ipcRenderer.send("web3-provider", url);
      store.dispatch(setRPCProviderUrl(url));

      store.dispatch(setBlockNumberToLatest());
      // store.dispatch(setAccounts());
      store.dispatch(getAccounts());
      store.dispatch(getGasPrice());
      store.dispatch(getGasLimit());

      store.dispatch(getBlockSubscription());

      store.dispatch(setServerStarted());

      store.dispatch(setStartupMode(startupMode));
      switch (startupMode) {
        case STARTUP_MODE.SAVING_WORKSPACE:
        case STARTUP_MODE.NEW_WORKSPACE: {
          store.dispatch(replace("/config"));
          break;
        }
        case STARTUP_MODE.NORMAL:
        default: {
          store.dispatch(replace("/accounts"));
          break;
        }
      }
    },
  );

  // Block polling happens in the chain process, and is passed through
  // the main process to the render process when there's a new block.
  ipcRenderer.on(SET_BLOCK_NUMBER, (event, number) => {
    store.dispatch(setBlockNumber(number));
  });

  ipcRenderer.on(SET_SYSTEM_ERROR, (event, error) => {
    handleError(store, error);
  });

  ipcRenderer.on(SET_MODAL_ERROR, (event, error) => {
    handleError(store, error);
  });

  // The server will send a second message that sets the mnemonic and hdpath
  ipcRenderer.on(SET_KEY_DATA, (event, data) => {
    store.dispatch(setKeyData(data.mnemonic, data.hdPath, data.privateKeys));
  });

  ipcRenderer.on(SHOW_HOME_SCREEN, () => {
    store.dispatch(showHomeScreen());
  });
}
