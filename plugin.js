// Opens the isolated, read-only time board. No task updates or external requests.
PluginAPI.registerHeaderButton({
  label: '时间规划',
  icon: 'view_week',
  onClick: () => PluginAPI.showIndexHtmlAsView(),
});
