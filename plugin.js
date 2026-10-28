// Opens the isolated, read-only time board. The UI defaults to English; Chinese can be selected inside the board.
PluginAPI.registerHeaderButton({
  label: 'Time Board',
  icon: 'view_week',
  onClick: () => PluginAPI.showIndexHtmlAsView(),
});
