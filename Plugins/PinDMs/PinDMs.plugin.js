/**
 * @name PinDMs
 * @authorId 278543574059057154
 * @invite Jx3TjNS
 * @donate https://www.paypal.me/MircoWittrien
 * @patreon https://www.patreon.com/MircoWittrien
 * @website https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/PinDMs
 * @source https://raw.githubusercontent.com/mwittrien/BetterDiscordAddons/master/Plugins/PinDMs/PinDMs.plugin.js
 * @updateUrl https://raw.githubusercontent.com/mwittrien/BetterDiscordAddons/master/Plugins/PinDMs/PinDMs.plugin.js
 */

module.exports = (_ => {
	const config = {
		"info": {
			"name": "PinDMs",
			"author": "DevilBro",
			"version": "1.7.8",
			"description": "Allow you to pin DMs, making them appear at the top of your DMs/Server-List"
		},
		"changeLog": {
			"added": {
				"Predefined Categories": "Added the option to enable predefined categories for the channel list in the settings that will automatically add the dms fitting the category topic"
			}
		}
	};

	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		getName () {return config.info.name;}
		getAuthor () {return config.info.author;}
		getVersion () {return config.info.version;}
		getDescription () {return config.info.description;}
		
		load() {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						require("request").get("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js", (e, r, b) => {
							if (!e && b && b.indexOf(`* @name BDFDB`) > -1) require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => {});
							else BdApi.alert("Error", "Could not download BDFDB library plugin, try again some time later.");
						});
					}
				});
			}
			if (!window.BDFDB_Global.pluginQueue.includes(config.info.name)) window.BDFDB_Global.pluginQueue.push(config.info.name);
		}
		start() {this.load();}
		stop() {}
		getSettingsPanel() {
			let template = document.createElement("template");
			template.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The library plugin needed for ${config.info.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
			template.content.firstElementChild.querySelector("a").addEventListener("click", _ => {
				require("request").get("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js", (e, r, b) => {
					if (!e && b && b.indexOf(`* @name BDFDB`) > -1) require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => {});
					else BdApi.alert("Error", "Could not download BDFDB library plugin, try again some time later.");
				});
			});
			return template.content.firstElementChild;
		}
	} : (([Plugin, BDFDB]) => {
		var hoveredCategory, draggedCategory, releasedCategory;
		var hoveredChannel, draggedChannel, releasedChannel;
		
		var settings = {}, preCategories = {}, preCollapseStates = {};
		
		return class PinDMs extends Plugin {
			onLoad() {
				this.defaults = {
					settings: {
						sortInRecentOrder:		{value: false, 	inner: true,		description: "Channel List"},
						sortInRecentOrderGuild:	{value: false, 	inner: true,		description: "Guild List"},
						showPinIcon:			{value: true, 	inner: false,		description: "Show a little 'Pin' icon for pinned DMs in the server list: "},
						showCategoryUnread:		{value: true, 	inner: false,		description: "Show the amount of unread Messages in a category in the channel list: "},
						showCategoryAmount:		{value: true, 	inner: false,		description: "Show the amount of pinned DMs in a category in the channel list: "}
					},
					preCategories: {
						friends:				{value: false,						description: "FRIENDS"},
						blocked:				{value: false,						description: "BLOCKED"},
						groups:					{value: false,						description: "GROUPS"}
					}
				};
				
				this.patchedModules = {
					before: {
						PrivateChannelsList: "render",
						UnreadDMs: "render"
					},
					after: {
						PrivateChannelsList: "render",
						UnreadDMs: "render",
						PrivateChannel: ["render", "componentDidMount"],
						DirectMessage: ["render", "componentDidMount", "componentWillUnmount"]
					}
				};
				
				this.css = `
					${BDFDB.dotCNS.dmchannel + BDFDB.dotCN.namecontainerchildren} {
						display: flex;
					}
					${BDFDB.dotCN.dmchannel}:hover ${BDFDB.dotCN._pindmsunpinbutton} {
						display: block;
					}
					${BDFDB.dotCN._pindmspinnedchannelsheadercontainer} {
						display: flex;
						cursor: pointer;
					}
					${BDFDB.dotCNS._pindmspinnedchannelsheadercontainer + BDFDB.dotCN.dmchannelheadertext}  {
						margin-right: 6px;
					}
					${BDFDB.dotCN._pindmspinnedchannelsheadercontainer + BDFDB.dotCN._pindmspinnedchannelsheadercolored}:hover ${BDFDB.dotCN.dmchannelheadertext} {
						filter: brightness(150%);
					}
					${BDFDB.dotCNS._pindmspinnedchannelsheadercontainer + BDFDB.dotCN._pindmspinnedchannelsheaderamount}  {
						position: relative;
						top: -1px;
						margin-right: 6px;
					}
					${BDFDB.dotCN._pindmspinnedchannelsheaderarrow} {
						flex: 0;
						width: 16px;
						height: 16px;
						margin-left: 0;
						margin-right: 2px;
					}
					${BDFDB.dotCNS._pindmspinnedchannelsheadercollapsed + BDFDB.dotCN._pindmspinnedchannelsheaderarrow + BDFDB.dotCN.channelheadericonwrapper} {
						transform: rotate(-90deg);
					}
					${BDFDB.dotCN._pindmsunpinbutton} {
						display: none;
						width: 16px;
						height: 16px;
						opacity: .7;
						margin: 2px;
					}
					${BDFDB.dotCN._pindmsunpinbutton}:hover {
						opacity: 1;
					}
					${BDFDB.dotCN._pindmsunpinicon} {
						display: block;
						width: 16px;
						height: 16px;
					}
					${BDFDB.dotCNS._pindmsdmchannelplaceholder + BDFDB.dotCN.namecontainerlayout} {
						box-sizing: border-box;
						border: 1px dashed currentColor;
					}
					${BDFDB.dotCN._pindmspinnedchannelsheadercontainer + BDFDB.dotCN._pindmsdmchannelplaceholder} {
						margin-left: 8px;
						height: 12px;
						box-sizing: border-box;
						border: 1px dashed currentColor;
					}
					${BDFDB.dotCN._pindmsdragpreview} {
						pointer-events: none !important;
						position: absolute !important;
						opacity: 0.5 !important;
						z-index: 10000 !important;
					}
				`;
			}
			
			onStart() {
				this.forceUpdateAll();
			}
			
			onStop() {
				this.forceUpdateAll();
				
				let unreadDMsInstance = BDFDB.ReactUtils.findOwner(document.querySelector(BDFDB.dotCN.app), {name: "UnreadDMs", unlimited: true});
				if (unreadDMsInstance) {
					delete unreadDMsInstance.props.pinnedPrivateChannelIds;
					unreadDMsInstance.props.unreadPrivateChannelIds = BDFDB.LibraryModules.DirectMessageUnreadStore.getUnreadPrivateChannelIds();
					BDFDB.ReactUtils.forceUpdate(unreadDMsInstance);
				}
			}

			getSettingsPanel (collapseStates = {}) {
				let settingsPanel, settingsItems = [];
				
				for (let key in settings) if (!this.defaults.settings[key].inner) settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
					type: "Switch",
					plugin: this,
					keys: ["settings", key],
					label: this.defaults.settings[key].description,
					value: settings[key]
				}));
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsPanelList, {
					title: "Sort pinned DMs in the 'recent message' order instead of the 'pinned at' order in:",
					dividerTop: true,
					dividerBottom: true,
					children: Object.keys(settings).map(key => this.defaults.settings[key].inner && BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "Switch",
						plugin: this,
						keys: ["settings", key],
						label: this.defaults.settings[key].description,
						value: settings[key]
					}))
				}));
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsPanelList, {
					title: "Add predefined category for:",
					dividerBottom: true,
					children: Object.keys(preCategories).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "Switch",
						plugin: this,
						keys: ["preCategories", key],
						label: BDFDB.LanguageUtils.LanguageStrings[this.defaults.preCategories[key].description],
						value: preCategories[key]
					}))
				}));
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsItem, {
					type: "Button",
					color: BDFDB.LibraryComponents.Button.Colors.RED,
					label: "Unpin all pinned DMs",
					onClick: _ => {
						BDFDB.ModalUtils.confirm(this, "Are you sure you want to unpin all pinned DMs?", _ => {
							BDFDB.DataUtils.remove(this, "dmCategories");
							BDFDB.DataUtils.remove(this, "pinnedRecents");
						});
					},
					children: BDFDB.LanguageUtils.LanguageStrings.UNPIN
				}));
				
				return settingsPanel = BDFDB.PluginUtils.createSettingsPanel(this, settingsItems);
			}

			onSettingsClosed () {
				if (this.SettingsUpdated) {
					delete this.SettingsUpdated;
					this.forceUpdateAll();
				}
			}

			forceUpdateAll () {
				settings = BDFDB.DataUtils.get(this, "settings");
				preCategories = BDFDB.DataUtils.get(this, "preCategories");
				preCollapseStates = BDFDB.DataUtils.load(this, "preCollapseStates");
				
				BDFDB.ReactUtils.forceUpdate(BDFDB.ReactUtils.findOwner(document.querySelector(BDFDB.dotCN.app), {name: "FluxContainer(PrivateChannels)", all: true, unlimited: true}));
				BDFDB.PatchUtils.forceAllUpdates(this);
			}

			onUserContextMenu (e) {
				if (e.instance.props.user) {
					let [children, index] = BDFDB.ContextMenuUtils.findItem(e.returnvalue, {id: "close-dm"});
					if (index > -1) {
						let id = BDFDB.LibraryModules.ChannelStore.getDMFromUserId(e.instance.props.user.id);
						if (id) this.injectItem(e.instance, id, children, index);
					}
				}
			}

			onGroupDMContextMenu (e) {
				if (e.instance.props.channel) {
					let [children, index] = BDFDB.ContextMenuUtils.findItem(e.returnvalue, {id: "change-icon"});
					if (index > -1) this.injectItem(e.instance, e.instance.props.channel.id, children, index + 1);
				}
			}

			injectItem (instance, id, children, index) {
				if (!id) return;
				let pinnedInGuild = this.isPinned(id, "pinnedRecents");
				
				let categories = this.sortAndUpdateCategories("dmCategories", true);
				let currentCategory = this.getCategory(id, "dmCategories");
				
				children.splice(index, 0, BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
					label: this.labels.context_pindm,
					id: BDFDB.ContextMenuUtils.createItemId(this.name, "submenu-pin"),
					children: [
						BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
							label: this.labels.context_pinchannel,
							id: BDFDB.ContextMenuUtils.createItemId(this.name, "submenu-channelist"),
							children: this.getPredefinedCategory(id) ? BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
									label: this.labels.context_inpredefined,
									id: BDFDB.ContextMenuUtils.createItemId(this.name, "in-predefined"),
									disabled: true
								}) : [
								BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
									children: currentCategory ? BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
										label: this.labels.context_unpinchannel,
										id: BDFDB.ContextMenuUtils.createItemId(this.name, "unpin-channellist"),
										color: BDFDB.LibraryComponents.MenuItems.Colors.DANGER,
										action: _ => {
											this.removeFromCategory(id, currentCategory, "dmCategories");
										}
									}) : BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
										label: this.labels.context_addtonewcategory,
										id: BDFDB.ContextMenuUtils.createItemId(this.name, "new-channellist"),
										color: BDFDB.LibraryComponents.MenuItems.Colors.BRAND,
										action: _ => {
											this.openCategorySettingsModal({
												id: this.generateID("dmCategories").toString(),
												name: `${this.labels.header_pinneddms} #${categories.length + 1}`,
												dms: [id],
												pos: categories.length,
												collapsed: false,
												color: null
											}, "dmCategories", true);
										}
									})
								}),
								categories.length ? BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
									children: categories.map(category => currentCategory && currentCategory.id == category.id || category.predefined ? null : BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
										label: category.name || this.labels.header_pinneddms,
										id: BDFDB.ContextMenuUtils.createItemId(this.name, "pin-channellist", category.id),
										action: _ => {
											if (currentCategory) this.removeFromCategory(id, currentCategory, "dmCategories");
											this.addToCategory(id, category, "dmCategories");
										}
									})).filter(n => n)
								}) : null
							].filter(n => n)
						}),
						BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
							label: this.labels[pinnedInGuild ? "context_unpinguild" : "context_pinguild"],
							id: BDFDB.ContextMenuUtils.createItemId(this.name, pinnedInGuild ? "unpin-serverlist" : "pin-serverlist"),
							danger: pinnedInGuild,
							action: _ => {
								if (!pinnedInGuild) this.addPin(id, "pinnedRecents");
								else this.removePin(id, "pinnedRecents");
							}
						})
					].filter(n => n)
				}));
			}
			
			processPrivateChannelsList (e) {
				let categories = this.sortAndUpdateCategories("dmCategories", true);
				if (categories.length) {
					e.instance.props.channels = Object.assign({}, e.instance.props.channels);
					e.instance.props.privateChannelIds = [].concat(e.instance.props.privateChannelIds || []);
					e.instance.props.pinnedChannelIds = Object.assign({}, e.instance.props.pinnedChannelIds);
					if (!e.returnvalue) {
						if (draggedChannel && releasedChannel) {
							let categoryId = releasedChannel.split("header_")[1];
							let category = categories.find(n => categoryId != undefined ? n.id == categoryId : n.dms.includes(releasedChannel));
							if (category) {
								BDFDB.ArrayUtils.remove(category.dms, draggedChannel, true);
								category.dms.splice(categoryId != undefined ? 0 : category.dms.indexOf(releasedChannel) + 1, 0, draggedChannel);
								BDFDB.DataUtils.save(category, this, "dmCategories", category.id);
							}
							draggedChannel = null;
							releasedChannel = null;
						}
						if (draggedCategory && releasedCategory) {
							let maybedDraggedCategory = categories.find(n => n.id == draggedCategory);
							let maybedReleasedCategory = categories.find(n => n.id == releasedCategory);
							if (maybedDraggedCategory && maybedReleasedCategory) {
								BDFDB.ArrayUtils.remove(categories, maybedDraggedCategory, true);
								categories.splice(categories.indexOf(maybedReleasedCategory) + 1, 0, maybedDraggedCategory);
								let newCategories = {}, newPos = 0;
								for (let category of [].concat(categories).reverse()) if (!category.predefined) newCategories[category.id] = Object.assign(category, {pos: newPos++});
								BDFDB.DataUtils.save(newCategories, this, "dmCategories");
							}
							draggedCategory = null;
							releasedCategory = null;
						}
						e.instance.props.pinnedChannelIds = {};
						for (let category of [].concat(categories).reverse()) {
							e.instance.props.pinnedChannelIds[category.id] = [];
							for (let id of this.sortDMsByTime(this.filterDMs(category.dms, !category.predefined), "dmCategories").reverse()) {
								BDFDB.ArrayUtils.remove(e.instance.props.privateChannelIds, id, true);
								if (!category.collapsed || e.instance.props.selectedChannelId == id) {
									e.instance.props.privateChannelIds.unshift(id);
									e.instance.props.pinnedChannelIds[category.id].push(id);
								}
							}
						}
					}
					else {
						if (typeof e.returnvalue.props.children == "function") {
							let childrenRender = e.returnvalue.props.children;
							e.returnvalue.props.children = (...args) => {
								let children = childrenRender(...args);
								this.injectCategories(e.instance, children, categories);
								return children;
							};
						}
						else this.injectCategories(e.instance, e.returnvalue, categories);
					}
					
					let pinnedIds = BDFDB.ObjectUtils.toArray(e.instance.props.pinnedChannelIds).reverse();
					BDFDB.PatchUtils.unpatch(this, e.instance, "renderDM");
					BDFDB.PatchUtils.patch(this, e.instance, "renderDM", {before: e2 => {
						if (e2.methodArguments[0] != 0) e2.methodArguments[1] += pinnedIds.slice(0, e2.methodArguments[0] - 1).flat().length;
					}, after: e2 => {
						if (e2.methodArguments[0] != 0) {
							let id = e.instance.props.privateChannelIds[e2.methodArguments[1]];
							e2.returnValue = e.instance.props.channels[id] ? BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.PrivateChannelItems[e.instance.props.channels[id].isMultiUserDM() ? "GroupDM" : "DirectMessage"], Object.assign({
								key: id,
								channel: e.instance.props.channels[id],
								selected: e.instance.props.selectedChannelId == id
							}, (e.instance.props.navigator || e.instance.props.listNavigator).getItemProps({
								index: e2.methodArguments[2]
							}))) : null;
							
							let category = categories[e2.methodArguments[0] - 1];
							if (category) {
								if (!id || (category.collapsed && e.instance.props.selectedChannelId != id) || !category.dms.includes(id) || draggedCategory == category.id  || draggedChannel == id) e2.returnValue = null;
								else if (hoveredCategory == category.id && [].concat(category.dms).reverse()[0] == id) e2.returnValue = [
									e2.returnValue,
									BDFDB.ReactUtils.createElement("h2", {
										className: BDFDB.disCNS.dmchannelheadercontainer + BDFDB.disCNS._pindmspinnedchannelsheadercontainer + BDFDB.disCNS._pindmsdmchannelplaceholder + BDFDB.disCN.namecontainernamecontainer
									})
								].filter(n => n);
								else if (hoveredChannel == id) e2.returnValue = [
									e2.returnValue,
									BDFDB.ReactUtils.createElement("div", {
										className: BDFDB.disCNS.dmchannel + BDFDB.disCNS._pindmsdmchannelpinned + BDFDB.disCNS._pindmsdmchannelplaceholder + BDFDB.disCN.namecontainernamecontainer,
										children: BDFDB.ReactUtils.createElement("div", {
											className: BDFDB.disCN.namecontainerlayout
										})
									})
								].filter(n => n);
							}
						}
					}}, {force: true, noCache: true});
				}
			}
			
			injectCategories (instance, returnvalue, categories) {
				returnvalue.props.sections = [];
				returnvalue.props.sections.push(instance.state.preRenderedChildren);
				let shownPinnedIds = BDFDB.ObjectUtils.toArray(instance.props.pinnedChannelIds).reverse();
				for (let ids of shownPinnedIds) returnvalue.props.sections.push(ids.length || 1);
				returnvalue.props.sections.push(instance.props.privateChannelIds.length - shownPinnedIds.flat().length);
				
				let sectionHeight = returnvalue.props.sectionHeight;
				let sectionHeightFunc = typeof sectionHeight != "function" ? _ => sectionHeight : sectionHeight;
				returnvalue.props.sectionHeight = (...args) => {
					if (args[0] != 0 && args[0] != returnvalue.props.sections.length - 1) {
						let category = categories[args[0] - 1];
						if (category) return 40;
					}
					return sectionHeightFunc(...args);
				};
				
				let rowHeight = returnvalue.props.rowHeight;
				let rowHeightFunc = typeof rowHeight != "function" ? _ => rowHeight : rowHeight;
				returnvalue.props.rowHeight = (...args) => {
					if (args[0] != 0 && args[0] != returnvalue.props.sections.length - 1) {
						let category = categories[args[0] - 1];
						if (category && (category.collapsed || category.id == draggedCategory)) return 0;
					}
					return rowHeightFunc(...args);
				};
				
				let renderRow = returnvalue.props.renderRow;
				returnvalue.props.renderRow = (...args) => {
					let row = renderRow(...args);
					return row && row.key == "no-private-channels" ? null : row;
				};
				
				let renderSection = returnvalue.props.renderSection;
				returnvalue.props.renderSection = (...args) => {
					if (args[0].section != 0 && args[0].section != returnvalue.props.sections.length - 1) {
						let category = categories[args[0].section - 1];
						if (category && draggedCategory != category.id) {
							let color = BDFDB.ColorUtils.convert(category.color, "RGBA");
							let foundDMs = this.filterDMs(category.dms, !category.predefined);
							let unreadAmount = settings.showCategoryUnread && BDFDB.ArrayUtils.sum(foundDMs.map(id => BDFDB.LibraryModules.UnreadChannelUtils.getMentionCount(id)));
							return category.predefined && foundDMs.length < 1 ? null : [
								BDFDB.ReactUtils.createElement("h2", {
									className: BDFDB.DOMUtils.formatClassName(BDFDB.disCN.dmchannelheadercontainer, BDFDB.disCN._pindmspinnedchannelsheadercontainer, category.collapsed && BDFDB.disCN._pindmspinnedchannelsheadercollapsed, color && BDFDB.disCN._pindmspinnedchannelsheadercolored, BDFDB.disCN.namecontainernamecontainer),
									categoryId: category.id,
									onMouseDown: category.predefined ? null : event => {
										event = event.nativeEvent || event;
										let node = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmspinnedchannelsheadercontainer, event.target).cloneNode(true);
										let mouseMove = event2 => {
											if (Math.sqrt((event.pageX - event2.pageX)**2) > 20 || Math.sqrt((event.pageY - event2.pageY)**2) > 20) {
												BDFDB.ListenerUtils.stopEvent(event);
												draggedCategory = category.id;
												this.updateContainer("dmCategories");
												let dragPreview = this.createDragPreview(node, event2);
												document.removeEventListener("mousemove", mouseMove);
												document.removeEventListener("mouseup", mouseUp);
												let dragging = event3 => {
													this.updateDragPreview(dragPreview, event3);
													let placeholder = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmsdmchannelplaceholder, event3.target);
													let categoryNode = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmspinnedchannelsheadercontainer, placeholder ? placeholder.previousSibling : event3.target);
													let maybeHoveredCategory = categoryNode && categoryNode.getAttribute("categoryId");
													let update = maybeHoveredCategory != hoveredCategory;
													if (maybeHoveredCategory && !preCategories[maybeHoveredCategory]) hoveredCategory = maybeHoveredCategory;
													else hoveredCategory = null;
													if (update) this.updateContainer("dmCategories");
												};
												let releasing = event3 => {
													BDFDB.DOMUtils.remove(dragPreview);
													if (hoveredCategory) releasedCategory = hoveredCategory;
													else draggedCategory = null;
													hoveredCategory = null;
													this.updateContainer("dmCategories");
													document.removeEventListener("mousemove", dragging);
													document.removeEventListener("mouseup", releasing);
												};
												document.addEventListener("mousemove", dragging);
												document.addEventListener("mouseup", releasing);
											}
										};
										let mouseUp = _ => {
											document.removeEventListener("mousemove", mouseMove);
											document.removeEventListener("mouseup", mouseUp);
										};
										document.addEventListener("mousemove", mouseMove);
										document.addEventListener("mouseup", mouseUp);
									},
									onClick: _ => {
										if (foundDMs.length || !category.collapsed) {
											category.collapsed = !category.collapsed;
											if (category.predefined) {
												preCollapseStates[category.id] = category.collapsed;
												BDFDB.DataUtils.save(category.collapsed, this, "preCollapseStates", category.id);
											}
											else BDFDB.DataUtils.save(category, this, "dmCategories", category.id);
											this.updateContainer("dmCategories");
										}
									},
									onContextMenu: event => {
										BDFDB.ContextMenuUtils.open(this, event, BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
											children: category.predefined ? BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
												label: this.labels.context_disablepredefined,
												id: BDFDB.ContextMenuUtils.createItemId(this.name, "disable-predefined"),
												action: _ => {
													preCategories[category.id] = false;
													BDFDB.DataUtils.save(preCategories, this, "preCategories");
													this.updateContainer("dmCategories");
												}
											}) : [
												BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
													label: BDFDB.LanguageUtils.LanguageStrings.CATEGORY_SETTINGS,
													id: BDFDB.ContextMenuUtils.createItemId(this.name, "category-settings"),
													action: _ => {
														this.openCategorySettingsModal(category, "dmCategories");
													}
												}),
												BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
													label: BDFDB.LanguageUtils.LanguageStrings.DELETE_CATEGORY,
													id: BDFDB.ContextMenuUtils.createItemId(this.name, "remove-category"),
													color: BDFDB.LibraryComponents.MenuItems.Colors.DANGER,
													action: _ => {
														BDFDB.DataUtils.remove(this, "dmCategories", category.id);
														this.updateContainer("dmCategories");
													}
												})
											]
										}));
									},
									children: [
										BDFDB.ObjectUtils.is(color) ? BDFDB.ReactUtils.createElement("span", {
											className: BDFDB.disCN.dmchannelheadertext,
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextGradientElement, {
												gradient: BDFDB.ColorUtils.createGradient(color),
												children: category.name
											})
										}) : BDFDB.ReactUtils.createElement("span", {
											className: BDFDB.disCN.dmchannelheadertext,
											style: {color: color},
											children: category.name,
										}),
										unreadAmount ? BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Badges.NumberBadge, {
											className: BDFDB.disCN._pindmspinnedchannelsheaderamount,
											count: unreadAmount,
											style: {backgroundColor: BDFDB.DiscordConstants.Colors.STATUS_RED}
										}) : null,
										settings.showCategoryAmount ? BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Badges.NumberBadge, {
											className: BDFDB.disCN._pindmspinnedchannelsheaderamount,
											count: foundDMs.length,
											style: {backgroundColor: "var(--bdfdb-blurple)"}
										}) : null,
										BDFDB.ReactUtils.createElement("div", {
											className: BDFDB.disCNS._pindmspinnedchannelsheaderarrow + BDFDB.disCNS.channelheadericonwrapper + BDFDB.disCN.channelheadericonclickable,
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SvgIcon, {
												className: BDFDB.disCNS._pindmspinnedchannelsheaderarrow + BDFDB.disCN.channelheadericon,
												nativeClass: true,
												iconSVG: `<svg width="24" height="24" viewBox="4 4 16 16"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z"></path></svg>`
											})
										})
									].filter(n => n)
								}),
								hoveredChannel == "header_" + category.id && BDFDB.ReactUtils.createElement("div", {
									className: BDFDB.disCNS.dmchannel + BDFDB.disCNS._pindmsdmchannelpinned + BDFDB.disCNS._pindmsdmchannelplaceholder + BDFDB.disCN.namecontainernamecontainer,
									children: BDFDB.ReactUtils.createElement("div", {
										className: BDFDB.disCN.namecontainerlayout
									})
								})
							].filter(n => n);
						}
						else return null;
					}
					else return renderSection(...args);
				};
			}

			processUnreadDMs (e) {
				e.instance.props.pinnedPrivateChannelIds = [];
				let sortedRecents = this.sortAndUpdate("pinnedRecents");
				if (sortedRecents.length) {
					e.instance.props.unreadPrivateChannelIds = [];
					for (let pos in sortedRecents) {
						let id = sortedRecents[pos];
						if (e.instance.props.channels[id]) {
							if (!e.instance.props.pinnedPrivateChannelIds.includes(id)) e.instance.props.pinnedPrivateChannelIds.push(id);
							if (!e.instance.props.unreadPrivateChannelIds.includes(id)) e.instance.props.unreadPrivateChannelIds.push(id);
						}
					}
					e.instance.props.unreadPrivateChannelIds = e.instance.props.unreadPrivateChannelIds.concat(BDFDB.LibraryModules.DirectMessageUnreadStore.getUnreadPrivateChannelIds());
					if (e.returnvalue) {
						if (draggedChannel && releasedChannel) {
							let pinnedPrivateChannelIds = [].concat(e.instance.props.pinnedPrivateChannelIds), newData = {};
							BDFDB.ArrayUtils.remove(pinnedPrivateChannelIds, draggedChannel, true);
							pinnedPrivateChannelIds.splice(pinnedPrivateChannelIds.indexOf(releasedChannel) + 1, 0, draggedChannel);
							for (let pos in pinnedPrivateChannelIds) newData[pinnedPrivateChannelIds[pos]] = parseInt(pos);
							BDFDB.DataUtils.save(newData, this, "pinnedRecents");
							draggedChannel = null;
							releasedChannel = null;
							BDFDB.ReactUtils.forceUpdate(e.instance);
						}
						if (draggedChannel) {
							let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {filter: child => BDFDB.ObjectUtils.get(child, "props.channel.id") == draggedChannel});
							children.splice(index, 1);
						}
						if (this.hoveredChannel) {
							let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {filter: child => BDFDB.ObjectUtils.get(child, "props.channel.id") == this.hoveredChannel});
							children.splice(index + 1, 0, BDFDB.ReactUtils.createElement("div", {
								className: BDFDB.disCNS.guildouter + BDFDB.disCN._pindmsrecentplaceholder,
								children: BDFDB.ReactUtils.createElement("div", {
									children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.GuildComponents.Items.DragPlaceholder, {})
								})
							}));
						}
					}
				}
				else e.instance.props.unreadPrivateChannelIds = BDFDB.LibraryModules.DirectMessageUnreadStore.getUnreadPrivateChannelIds();
			}

			processPrivateChannel (e) {
				if (e.instance.props.channel && !this.getPredefinedCategory(e.instance.props.channel.id)) {
					let category = this.getCategory(e.instance.props.channel.id, "dmCategories");
					if (category) {
						if (e.node) {
							BDFDB.DOMUtils.addClass(e.node, BDFDB.disCN._pindmsdmchannelpinned);
							e.node.removeEventListener("mousedown", e.node.PinDMsMouseDownListener);
							if (!settings.sortInRecentOrder) {
								e.node.setAttribute("draggable", false);
								e.node.PinDMsMouseDownListener = event => {
									if (!this.started) e.node.removeEventListener("mousedown", e.node.PinDMsMouseDownListener);
									else {
										event = event.nativeEvent || event;
										let mouseMove = event2 => {
											if (Math.sqrt((event.pageX - event2.pageX)**2) > 20 || Math.sqrt((event.pageY - event2.pageY)**2) > 20) {
												BDFDB.ListenerUtils.stopEvent(event);
												draggedChannel = e.instance.props.channel.id;
												this.updateContainer("dmCategories");
												let dragPreview = this.createDragPreview(e.node, event2);
												document.removeEventListener("mousemove", mouseMove);
												document.removeEventListener("mouseup", mouseUp);
												let dragging = event3 => {
													this.updateDragPreview(dragPreview, event3);
													let maybeHoveredChannel = null;
													let categoryNode = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmspinnedchannelsheadercontainer, event3.target);
													if (categoryNode) {
														let hoveredCategoryId = categoryNode.getAttribute("categoryid");
														if (hoveredCategoryId && hoveredCategoryId == category.id) maybeHoveredChannel = "header_" + category.id;
													}
													else {
														let placeholder = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmsdmchannelplaceholder, event3.target);
														maybeHoveredChannel = (BDFDB.ReactUtils.findValue(BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmsdmchannelpinned, placeholder ? placeholder.previousSibling : event3.target), "channel", {up: true}) || {}).id;
														let maybeHoveredCategory = maybeHoveredChannel && this.getCategory(maybeHoveredChannel, "dmCategories");
														if (!maybeHoveredCategory || maybeHoveredCategory.id != category.id) maybeHoveredChannel = null;
													};
													let update = maybeHoveredChannel != hoveredChannel;
													if (maybeHoveredChannel) hoveredChannel = maybeHoveredChannel;
													else hoveredChannel = null; 
													if (update) this.updateContainer("dmCategories");
												};
												let releasing = event3 => {
													BDFDB.DOMUtils.remove(dragPreview);
													if (hoveredChannel) releasedChannel = hoveredChannel;
													else draggedChannel = null;
													hoveredChannel = null;
													this.updateContainer("dmCategories");
													document.removeEventListener("mousemove", dragging);
													document.removeEventListener("mouseup", releasing);
												};
												document.addEventListener("mousemove", dragging);
												document.addEventListener("mouseup", releasing);
											}
										};
										let mouseUp = _ => {
											document.removeEventListener("mousemove", mouseMove);
											document.removeEventListener("mouseup", mouseUp);
										};
										document.addEventListener("mousemove", mouseMove);
										document.addEventListener("mouseup", mouseUp);
									}
								};
								e.node.addEventListener("mousedown", e.node.PinDMsMouseDownListener);
							}
						}
						if (e.returnvalue) e.returnvalue.props.children = [
							BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TooltipContainer, {
								text: BDFDB.LanguageUtils.LanguageStrings.UNPIN,
								children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Clickable, {
									className: BDFDB.disCN._pindmsunpinbutton,
									onClick: event => {
										BDFDB.ListenerUtils.stopEvent(event);
										this.removeFromCategory(e.instance.props.channel.id, category, "dmCategories");
									},
									children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SvgIcon, {
										className: BDFDB.disCN._pindmsunpinicon,
										name: BDFDB.LibraryComponents.SvgIcon.Names.PIN
									})
								})
							}),
							e.returnvalue.props.children
						].flat(10).filter(n => n);
					}
				}
			}

			processDirectMessage (e) {
				if (e.instance.props.channel) {
					if (e.node && e.methodname == "componentDidMount") {
						BDFDB.DOMUtils.removeClass(e.node, BDFDB.disCN._pindmsrecentpinned);
						e.node.removeEventListener("contextmenu", e.node.PinDMsContextMenuListener);
						e.node.PinDMsContextMenuListener = event => {BDFDB.DMUtils.openMenu(e.instance.props.channel.id, event);};
						e.node.addEventListener("contextmenu", e.node.PinDMsContextMenuListener);
						if (this.isPinned(e.instance.props.channel.id, "pinnedRecents")) {
							BDFDB.DOMUtils.addClass(e.node, BDFDB.disCN._pindmsrecentpinned);
							e.node.removeEventListener("mousedown", e.node.PinDMsMouseDownListener);
							if (!settings.sortInRecentOrderGuild) {
								for (let child of e.node.querySelectorAll("a")) child.setAttribute("draggable", false);
								e.node.PinDMsMouseDownListener = event => {
									let mousemove = event2 => {
										if (Math.sqrt((event.pageX - event2.pageX)**2) > 20 || Math.sqrt((event.pageY - event2.pageY)**2) > 20) {
											BDFDB.ListenerUtils.stopEvent(event);
											draggedChannel = e.instance.props.channel.id;
											BDFDB.PatchUtils.forceAllUpdates(this, "UnreadDMs");
											let dragPreview = this.createDragPreview(e.node, event2);
											document.removeEventListener("mousemove", mousemove);
											document.removeEventListener("mouseup", mouseup);
											let dragging = event3 => {
												this.updateDragPreview(dragPreview, event3);
												let placeholder = BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmsrecentplaceholder, event3.target);
												let maybeHoveredChannel = (BDFDB.ReactUtils.findValue(BDFDB.DOMUtils.getParent(BDFDB.dotCN._pindmsrecentpinned, placeholder ? placeholder.previousSibling : event3.target), "channel", {up: true}) || {}).id;
												let update = maybeHoveredChannel != hoveredChannel;
												if (maybeHoveredChannel) hoveredChannel = maybeHoveredChannel;
												else hoveredChannel = null; 
												if (update) BDFDB.PatchUtils.forceAllUpdates(this, "UnreadDMs");
											};
											let releasing = event3 => {
												BDFDB.DOMUtils.remove(dragPreview);
												if (hoveredChannel) releasedChannel = hoveredChannel;
												else draggedChannel = null;
												hoveredChannel = null;
												BDFDB.PatchUtils.forceAllUpdates(this, "UnreadDMs");
												document.removeEventListener("mousemove", dragging);
												document.removeEventListener("mouseup", releasing);
											};
											document.addEventListener("mousemove", dragging);
											document.addEventListener("mouseup", releasing);
										}
									};
									let mouseup = _ => {
										document.removeEventListener("mousemove", mousemove);
										document.removeEventListener("mouseup", mouseup);
									};
									document.addEventListener("mousemove", mousemove);
									document.addEventListener("mouseup", mouseup);
								};
								e.node.addEventListener("mousedown", e.node.PinDMsMouseDownListener);
							}
						}
					}
					if (e.node && e.methodname == "componentWillUnmount") {
						BDFDB.PatchUtils.forceAllUpdates(this, "PrivateChannelsList");
					}
					if (e.returnvalue && this.isPinned(e.instance.props.channel.id, "pinnedRecents") && settings.showPinIcon) {
						let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: "BlobMask"});
						if (index > -1) children[index].props.upperLeftBadge = BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Badges.IconBadge, {
							className: BDFDB.disCN.guildiconbadge,
							disableColor: true,
							style: {transform: "scale(-1, 1)"},
							icon: BDFDB.LibraryComponents.SvgIcon.Names.NOVA_PIN
						});
					}
				}
			}

			generateID (type) {
				if (!type) return null;
				let categories = BDFDB.DataUtils.load(this, type);
				let id = Math.round(Math.random() * 10000000000000000);
				return categories[id] ? this.generateID() : id;
			}
			
			filterDMs (dms, removePredefined) {
				return dms.filter(id => BDFDB.LibraryModules.ChannelStore.getChannel(id) && !(removePredefined && this.getPredefinedCategory(id)));
			}

			addToCategory (id, category, type) {
				if (!id || !category || !type) return;
				let wasEmpty = !this.filterDMs(category.dms).length;
				if (!category.dms.includes(id)) category.dms.unshift(id);
				if (wasEmpty && category.dms.length) category.collapsed = false;
				BDFDB.DataUtils.save(category, this, type, category.id);
				this.updateContainer(type);
			}

			removeFromCategory (id, category, type) {
				if (!id || !category || !type) return;
				BDFDB.ArrayUtils.remove(category.dms, id, true);
				if (!this.filterDMs(category.dms).length) category.collapsed = true;
				BDFDB.DataUtils.save(category, this, type, category.id);
				this.updateContainer(type);
			}

			getCategory (id, type) {
				if (!id || !type) return null;
				let categories = BDFDB.DataUtils.load(this, type);
				for (let catId in categories) if (categories[catId].dms.includes(id)) return categories[catId];
				return null;
			}
			
			getPredefinedCategory (id) {
				if (!id) return "";
				let channel = BDFDB.LibraryModules.ChannelStore.getChannel(id);
				if (!channel) return "";
				else if (preCategories.friends && channel.isDM() && BDFDB.LibraryModules.FriendUtils.isFriend(channel.recipients[0])) return "friends";
				else if (preCategories.blocked && channel.isDM() && BDFDB.LibraryModules.FriendUtils.isBlocked(channel.recipients[0])) return "blocked";
				else if (preCategories.groups && channel.isGroupDM()) return "groups";
				return "";
			}

			sortAndUpdateCategories (type, reverse) {
				let data = BDFDB.ObjectUtils.sort(BDFDB.DataUtils.load(this, type), "pos"), newData = {};
				let sorted = [], pos = 0, sort = id => {
					if (sorted[pos] === undefined) {
						newData[id] = Object.assign({}, data[id], {pos});
						sorted[pos] = newData[id];
					}
					else {
						pos++;
						sort(id);
					}
				};
				for (let id in data) sort(id);
				if (!BDFDB.equals(data, newData)) BDFDB.DataUtils.save(newData, this, type);
				if (type == "dmCategories" && Object.keys(preCategories).some(type => preCategories[type])) {
					let predefinedDMs = {};
					for (let channelId of BDFDB.LibraryModules.DirectMessageStore.getPrivateChannelIds()) {
						let category = this.getPredefinedCategory(channelId);
						if (category) {
							if (!predefinedDMs[category]) predefinedDMs[category] = [];
							predefinedDMs[category].push(channelId);
						}
					}
					for (let type in predefinedDMs) if (predefinedDMs[type].length) sorted.unshift({
						predefined: true,
						collapsed: preCollapseStates[type],
						color: null,
						dms: predefinedDMs[type],
						id: type,
						name: BDFDB.LanguageUtils.LanguageStrings[this.defaults.preCategories[type].description]
					});
				}
				return (reverse ? sorted.reverse() : sorted).filter(n => n);
			}
			
			sortDMsByTime (dms, type) {
				if (dms.length > 1 && settings[type == "dmCategories" ? "sortInRecentOrder" : "sortInRecentOrderGuild"]) {
					let timestamps = BDFDB.LibraryModules.DirectMessageStore.getPrivateChannelIds().reduce((newObj, channelId) => (newObj[channelId] = BDFDB.LibraryModules.UnreadChannelUtils.lastMessageId(channelId), newObj), {});
					return [].concat(dms).sort(function (x, y) {return timestamps[x] > timestamps[y] ? -1 : timestamps[x] < timestamps[y] ? 1 : 0;});
				}
				else return dms;
			}
			
			openCategorySettingsModal (data, type, isNew) {
				if (BDFDB.ObjectUtils.is(data) && type) BDFDB.ModalUtils.open(this, {
					size: "MEDIUM",
					header: BDFDB.LanguageUtils.LanguageStrings.CATEGORY_SETTINGS,
					subheader: data.name,
					children: [
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormItem, {
							title: BDFDB.LanguageUtils.LanguageStrings.CATEGORY_NAME,
							className: BDFDB.disCN.marginbottom20 + " input-categoryname",
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
									value: data.name,
									placeholder: data.name,
									autoFocus: true
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormDivider, {
									className: BDFDB.disCN.dividerdefault
								})
							]
						}),
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormItem, {
							title: this.labels.modal_colorpicker1,
							className: BDFDB.disCN.marginbottom20,
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ColorSwatches, {
									color: data.color,
									number: 1
								})
							]
						})
					],
					buttons: [{
						contents: isNew ? BDFDB.LanguageUtils.LanguageStrings.CREATE : BDFDB.LanguageUtils.LanguageStrings.SAVE,
						color: "BRAND",
						close: true,
						click: modal => {
							data.name = modal.querySelector(".input-categoryname " + BDFDB.dotCN.input).value.trim() || data.name;

							data.color = BDFDB.ColorUtils.getSwatchColor(modal, 1);
							if (data.color != null && !BDFDB.ObjectUtils.is(data.color)) {
								if (data.color[0] < 30 && data.color[1] < 30 && data.color[2] < 30) data.color = BDFDB.ColorUtils.change(data.color, 30);
								else if (data.color[0] > 225 && data.color[1] > 225 && data.color[2] > 225) data.color = BDFDB.ColorUtils.change(data.color, -30);
							}
							
							BDFDB.DataUtils.save(data, this, type, data.id);
							
							this.updateContainer(type);
						}
					}]
				});
			}

			addPin (newid, type) {
				if (!newid) return;
				let pinnedDMs = BDFDB.DataUtils.load(this, type);
				for (let id in pinnedDMs) pinnedDMs[id] = pinnedDMs[id] + 1;
				pinnedDMs[newid] = 0;
				BDFDB.DataUtils.save(pinnedDMs, this, type);
				this.updateContainer(type);
			}

			removePin (id, type) {
				if (!id) return;
				BDFDB.DataUtils.remove(this, type, id);
				this.updateContainer(type);
			}
			
			isPinned (id, type) {
				return BDFDB.DataUtils.load(this, type, id) != undefined;
			}
			
			updateContainer (type) {
				switch (type) {
					case "dmCategories": 
						BDFDB.PatchUtils.forceAllUpdates(this, "PrivateChannelsList");
						break;
					case "pinnedRecents": 
						BDFDB.PatchUtils.forceAllUpdates(this, "UnreadDMs");
						break;
				}
			}

			sortAndUpdate (type) {
				let data = BDFDB.DataUtils.load(this, type), newData = {};
				delete data[""];
				delete data["null"];
				let sortedDMs = [], existingDMs = [], sortDM = (id, pos) => {
					if (sortedDMs[pos] === undefined) sortedDMs[pos] = id;
					else sortDM(id, pos + 1);
				};
				for (let id in data) sortDM(id, data[id]);
				sortedDMs = sortedDMs.filter(n => n);
				for (let pos in sortedDMs) {
					newData[sortedDMs[pos]] = parseInt(pos);
					if (BDFDB.LibraryModules.ChannelStore.getChannel(sortedDMs[pos])) existingDMs.push(sortedDMs[pos]);
				}
				if (!BDFDB.equals(data, newData)) BDFDB.DataUtils.save(newData, this, type);
				return this.sortDMsByTime(existingDMs, type);
			}

			createDragPreview (div, event) {
				if (!Node.prototype.isPrototypeOf(div)) return;
				let dragPreview = div.cloneNode(true);
				BDFDB.DOMUtils.addClass(dragPreview, BDFDB.disCN._pindmsdragpreview);
				BDFDB.DOMUtils.remove(dragPreview.querySelector(BDFDB.dotCNC.guildlowerbadge + BDFDB.dotCNC.guildupperbadge + BDFDB.dotCN.guildpillwrapper));
				document.querySelector(BDFDB.dotCN.appmount).appendChild(dragPreview);
				let rects = BDFDB.DOMUtils.getRects(dragPreview);
				BDFDB.DOMUtils.hide(dragPreview);
				dragPreview.style.setProperty("pointer-events", "none", "important");
				dragPreview.style.setProperty("left", event.clientX - (rects.width/2) + "px", "important");
				dragPreview.style.setProperty("top", event.clientY - (rects.height/2) + "px", "important");
				return dragPreview;
			}

			updateDragPreview (dragPreview, event) {
				if (!Node.prototype.isPrototypeOf(dragPreview)) return;
				BDFDB.DOMUtils.show(dragPreview);
				let rects = BDFDB.DOMUtils.getRects(dragPreview);
				dragPreview.style.setProperty("left", event.clientX - (rects.width/2) + "px", "important");
				dragPreview.style.setProperty("top", event.clientY - (rects.height/2) + "px", "important");
			}

			setLabelsByLanguage () {
				switch (BDFDB.LanguageUtils.getLanguage().id) {
					case "bg":		// Bulgarian
						return {
							context_addtonewcategory:			"???????????????? ?????? ???????? ??????????????????",
							context_disablepredefined:			"?????????????????????????? ?????????????????????????? ???????????????????? ??????????????????",
							context_inpredefined:				"?????????????????? ?? ?????????????????????????? ???????????????????? ??????????????????",
							context_pinchannel:					"?????????????????? ?????? ?????????????? ?? ????????????",
							context_pindm:						"???????????????? ???????????????? ??????????????????",
							context_pinguild:					"?????????????????? ?????? ?????????????? ?????? ??????????????",
							context_unpinchannel:				"???????????????? ???? ?????????????? ?? ????????????",
							context_unpinguild:					"???????????????? ???? ?????????????? ?????? ??????????????",
							header_pinneddms:					"???????????????? ???????????????? ??????????????????",
							modal_colorpicker1:					"?????????????????? ????????"
						};
					case "da":		// Danish
						return {
							context_addtonewcategory:			"F??j til ny kategori",
							context_disablepredefined:			"Deaktiver foruddefineret kategori",
							context_inpredefined:				"Fastgjort i en foruddefineret kategori",
							context_pinchannel:					"Fastg??r til kanallisten",
							context_pindm:						"Pin direkte besked",
							context_pinguild:					"Fastg??r til serverlisten",
							context_unpinchannel:				"Fjern fra kanallisten",
							context_unpinguild:					"Fjern fra serverlisten",
							header_pinneddms:					"Fastgjorte direkte beskeder",
							modal_colorpicker1:					"Kategorifarve"
						};
					case "de":		// German
						return {
							context_addtonewcategory:			"Zur neuen Kategorie hinzuf??gen",
							context_disablepredefined:			"Vordefinierte Kategorie deaktivieren",
							context_inpredefined:				"In vordefinierter Kategorie angeheftet",
							context_pinchannel:					"An Kanalliste anheften",
							context_pindm:						"Direktnachricht anheften",
							context_pinguild:					"An Serverliste anheften",
							context_unpinchannel:				"Von Kanalliste losl??sen",
							context_unpinguild:					"Von Serverliste losl??sen",
							header_pinneddms:					"Gepinnte Direktnachrichten",
							modal_colorpicker1:					"Kategoriefarbe"
						};
					case "el":		// Greek
						return {
							context_addtonewcategory:			"???????????????? ???? ?????? ??????????????????",
							context_disablepredefined:			"???????????????????????????? ?????????????????????????????? ????????????????????",
							context_inpredefined:				"???????????????????????? ???? ?????? ???????????????????????????? ??????????????????",
							context_pinchannel:					"???????????????????? ?????? ?????????? ????????????????",
							context_pindm:						"?????????????????????? ???? ?????????? ????????????",
							context_pinguild:					"???????????????????? ?????? ?????????? ??????????????????????",
							context_unpinchannel:				"???????????????????? ?????? ???? ?????????? ????????????????",
							context_unpinguild:					"???????????????????? ?????? ???? ?????????? ??????????????????????",
							header_pinneddms:					"???????????????????????? ?????????? ????????????????",
							modal_colorpicker1:					"?????????? ????????????????????"
						};
					case "es":		// Spanish
						return {
							context_addtonewcategory:			"Agregar a una nueva categor??a",
							context_disablepredefined:			"Desactivar categor??a predefinida",
							context_inpredefined:				"Anclado en una categor??a predefinida",
							context_pinchannel:					"Anclar a la lista de canales",
							context_pindm:						"Pin de mensaje directo",
							context_pinguild:					"Anclar a la lista de servidores",
							context_unpinchannel:				"Separar de la lista de canales",
							context_unpinguild:					"Separar de la lista de servidores",
							header_pinneddms:					"Mensajes directos fijados",
							modal_colorpicker1:					"Color de categor??a"
						};
					case "fi":		// Finnish
						return {
							context_addtonewcategory:			"Lis???? uuteen luokkaan",
							context_disablepredefined:			"Poista ennalta m????ritetty luokka k??yt??st??",
							context_inpredefined:				"Kiinnitetty ennalta m????ritettyyn luokkaan",
							context_pinchannel:					"Kiinnit?? kanavaluetteloon",
							context_pindm:						"Kiinnit?? suora viesti",
							context_pinguild:					"Kiinnit?? palvelinluetteloon",
							context_unpinchannel:				"Irrota kanavaluettelosta",
							context_unpinguild:					"Irrota palvelinluettelosta",
							header_pinneddms:					"Kiinnitetyt suorat viestit",
							modal_colorpicker1:					"Luokan v??ri"
						};
					case "fr":		// French
						return {
							context_addtonewcategory:			"Ajouter ?? une nouvelle cat??gorie",
							context_disablepredefined:			"D??sactiver la cat??gorie pr??d??finie",
							context_inpredefined:				"??pingl?? dans une cat??gorie pr??d??finie",
							context_pinchannel:					"??pingler ?? la liste des salons",
							context_pindm:						"??pingler le message priv??",
							context_pinguild:					"??pingler ?? la liste des serveurs",
							context_unpinchannel:				"D??tacher de la liste des salons",
							context_unpinguild:					"D??tacher de la liste des serveurs",
							header_pinneddms:					"Messages priv??s ??pingl??s",
							modal_colorpicker1:					"Couleur de la cat??gorie"
						};
					case "hr":		// Croatian
						return {
							context_addtonewcategory:			"Dodaj u novu kategoriju",
							context_disablepredefined:			"Deaktivirajte unaprijed definiranu kategoriju",
							context_inpredefined:				"Prikva??eno u unaprijed definiranoj kategoriji",
							context_pinchannel:					"Prikva??i na popis kanala",
							context_pindm:						"Prikva??i izravnu poruku",
							context_pinguild:					"Prikva??i na popis poslu??itelja",
							context_unpinchannel:				"Odvojite se od popisa kanala",
							context_unpinguild:					"Odvojite se od popisa poslu??itelja",
							header_pinneddms:					"Prikva??ene izravne poruke",
							modal_colorpicker1:					"Boja kategorije"
						};
					case "hu":		// Hungarian
						return {
							context_addtonewcategory:			"Hozz??ad??s ??j kateg??ri??hoz",
							context_disablepredefined:			"Deaktiv??lja az el??re defini??lt kateg??ri??t",
							context_inpredefined:				"El??re meghat??rozott kateg??ri??ban r??gz??tve",
							context_pinchannel:					"R??gz??t??s a csatornalist??hoz",
							context_pindm:						"K??zvetlen ??zenet r??gz??t??se",
							context_pinguild:					"R??gz??t??s a kiszolg??l?? list??hoz",
							context_unpinchannel:				"Lev??laszt??s a csatornalist??r??l",
							context_unpinguild:					"Lev??laszt??s a kiszolg??l?? list??r??l",
							header_pinneddms:					"R??gz??tett k??zvetlen ??zenetek",
							modal_colorpicker1:					"Kateg??ria sz??ne"
						};
					case "it":		// Italian
						return {
							context_addtonewcategory:			"Aggiungi a una nuova categoria",
							context_disablepredefined:			"Disattiva la categoria predefinita",
							context_inpredefined:				"Bloccato in una categoria predefinita",
							context_pinchannel:					"Fissa all'elenco dei canali",
							context_pindm:						"Metti il ??????messaggio diretto",
							context_pinguild:					"Aggiungi all'elenco dei server",
							context_unpinchannel:				"Scollega dall'elenco dei canali",
							context_unpinguild:					"Scollega dall'elenco dei server",
							header_pinneddms:					"Messaggi diretti appuntati",
							modal_colorpicker1:					"Colore della categoria"
						};
					case "ja":		// Japanese
						return {
							context_addtonewcategory:			"??????????????????????????????",
							context_disablepredefined:			"?????????????????????????????????????????????????????????",
							context_inpredefined:				"??????????????????????????????????????????",
							context_pinchannel:					"??????????????????????????????",
							context_pindm:						"?????????????????????????????????????????????",
							context_pinguild:					"????????????????????????????????????",
							context_unpinchannel:				"???????????????????????????????????????",
							context_unpinguild:					"???????????????????????????????????????",
							header_pinneddms:					"?????????????????????????????????????????????",
							modal_colorpicker1:					"?????????????????????"
						};
					case "ko":		// Korean
						return {
							context_addtonewcategory:			"??? ??????????????? ??????",
							context_disablepredefined:			"?????? ?????? ??? ???????????? ????????????",
							context_inpredefined:				"?????? ?????? ??? ??????????????? ?????????",
							context_pinchannel:					"?????? ????????? ??????",
							context_pindm:						"?????? ??????",
							context_pinguild:					"?????? ????????? ??????",
							context_unpinchannel:				"?????? ???????????? ??????",
							context_unpinguild:					"?????? ???????????? ??????",
							header_pinneddms:					"?????? ??? ??????",
							modal_colorpicker1:					"???????????? ??????"
						};
					case "lt":		// Lithuanian
						return {
							context_addtonewcategory:			"Prid??ti prie naujos kategorijos",
							context_disablepredefined:			"I??junkite i?? anksto nustatyt?? kategorij??",
							context_inpredefined:				"Prisegta i?? anksto nustatytoje kategorijoje",
							context_pinchannel:					"Prisegti prie kanal?? s??ra??o",
							context_pindm:						"Prisegti tiesiogin?? prane??im??",
							context_pinguild:					"Prisegti prie serverio s??ra??o",
							context_unpinchannel:				"Atsijungti nuo kanal?? s??ra??o",
							context_unpinguild:					"Atsijungti nuo serverio s??ra??o",
							header_pinneddms:					"Prisegti tiesioginiai prane??imai",
							modal_colorpicker1:					"Kategorijos spalva"
						};
					case "nl":		// Dutch
						return {
							context_addtonewcategory:			"Toevoegen aan nieuwe categorie",
							context_disablepredefined:			"Schakel de voorgedefinieerde categorie uit",
							context_inpredefined:				"Vastgezet in een vooraf gedefinieerde categorie",
							context_pinchannel:					"Vastzetten op kanalenlijst",
							context_pindm:						"Direct bericht vastzetten",
							context_pinguild:					"Vastzetten op serverlijst",
							context_unpinchannel:				"Maak los van de zenderlijst",
							context_unpinguild:					"Maak los van de serverlijst",
							header_pinneddms:					"Vastgezette directe berichten",
							modal_colorpicker1:					"Categorie kleur"
						};
					case "no":		// Norwegian
						return {
							context_addtonewcategory:			"Legg til i ny kategori",
							context_disablepredefined:			"Deaktiver forh??ndsdefinert kategori",
							context_inpredefined:				"Festet i en forh??ndsdefinert kategori",
							context_pinchannel:					"Fest til kanallisten",
							context_pindm:						"Fest direkte melding",
							context_pinguild:					"Fest til serverlisten",
							context_unpinchannel:				"Koble fra kanallisten",
							context_unpinguild:					"Koble fra serverlisten",
							header_pinneddms:					"Festede direktemeldinger",
							modal_colorpicker1:					"Kategorifarge"
						};
					case "pl":		// Polish
						return {
							context_addtonewcategory:			"Dodaj do nowej kategorii",
							context_disablepredefined:			"Dezaktywuj predefiniowan?? kategori??",
							context_inpredefined:				"Przypi??ty w predefiniowanej kategorii",
							context_pinchannel:					"Przypnij do listy kana????w",
							context_pindm:						"Przypnij bezpo??redni?? wiadomo????",
							context_pinguild:					"Przypnij do listy serwer??w",
							context_unpinchannel:				"Od????cz od listy kana????w",
							context_unpinguild:					"Od????cz od listy serwer??w",
							header_pinneddms:					"Przypi??te czaty",
							modal_colorpicker1:					"Kolor kategorii"
						};
					case "pt-BR":	// Portuguese (Brazil)
						return {
							context_addtonewcategory:			"Adicionar ?? nova categoria",
							context_disablepredefined:			"Desativar categoria predefinida",
							context_inpredefined:				"Fixado em uma categoria predefinida",
							context_pinchannel:					"Fixar na lista de canais",
							context_pindm:						"Fixar mensagem direta",
							context_pinguild:					"Fixar na lista de servidores",
							context_unpinchannel:				"Desanexar da lista de canais",
							context_unpinguild:					"Desanexar da lista de servidores",
							header_pinneddms:					"Mensagens diretas fixadas",
							modal_colorpicker1:					"Cor da categoria"
						};
					case "ro":		// Romanian
						return {
							context_addtonewcategory:			"Ad??uga??i la o nou?? categorie",
							context_disablepredefined:			"Dezactiva??i categoria predefinit??",
							context_inpredefined:				"Fixat ??ntr-o categorie predefinit??",
							context_pinchannel:					"Fixa??i ??n lista de canale",
							context_pindm:						"Fixa??i mesajul direct",
							context_pinguild:					"Fixa??i pe lista serverului",
							context_unpinchannel:				"Desprinde??i din lista de canale",
							context_unpinguild:					"Desprinde??i din lista serverelor",
							header_pinneddms:					"Mesaje directe fixate",
							modal_colorpicker1:					"Culoarea categoriei"
						};
					case "ru":		// Russian
						return {
							context_addtonewcategory:			"???????????????? ?? ?????????? ??????????????????",
							context_disablepredefined:			"?????????????????? ???????????????????????????????? ??????????????????",
							context_inpredefined:				"???????????????????? ?? ???????????????????????????????? ??????????????????",
							context_pinchannel:					"?????????????????? ?? ???????????? ??????????????",
							context_pindm:						"?????????????????? ???????????? ??????????????????",
							context_pinguild:					"?????????????????? ?? ???????????? ????????????????",
							context_unpinchannel:				"?????????????????? ???? ???????????? ??????????????",
							context_unpinguild:					"?????????????????? ???? ???????????? ????????????????",
							header_pinneddms:					"???????????????????????? ???????????? ??????????????????",
							modal_colorpicker1:					"???????? ??????????????????"
						};
					case "sv":		// Swedish
						return {
							context_addtonewcategory:			"L??gg till i ny kategori",
							context_disablepredefined:			"Inaktivera f??rdefinierad kategori",
							context_inpredefined:				"F??sts i en f??rdefinierad kategori",
							context_pinchannel:					"F??st i kanallistan",
							context_pindm:						"F??st direktmeddelande",
							context_pinguild:					"F??st i serverlistan",
							context_unpinchannel:				"Ta bort fr??n kanallistan",
							context_unpinguild:					"Ta bort fr??n serverlistan",
							header_pinneddms:					"F??sta direktmeddelanden",
							modal_colorpicker1:					"Kategorif??rg"
						};
					case "th":		// Thai
						return {
							context_addtonewcategory:			"?????????????????????????????????????????????????????????",
							context_disablepredefined:			"????????????????????????????????????????????????????????????????????????????????????????????????????????????",
							context_inpredefined:				"????????????????????????????????????????????????????????????????????????????????????????????????????????????",
							context_pinchannel:					"????????????????????????????????????????????????",
							context_pindm:						"???????????????????????????????????????????????????",
							context_pinguild:					"????????????????????????????????????????????????????????????????????????",
							context_unpinchannel:				"?????????????????????????????????????????????????????????",
							context_unpinguild:					"??????????????????????????????????????????????????????????????????????????????",
							header_pinneddms:					"?????????????????????????????????????????????????????????????????????",
							modal_colorpicker1:					"??????????????????????????????"
						};
					case "tr":		// Turkish
						return {
							context_addtonewcategory:			"Yeni kategoriye ekle",
							context_disablepredefined:			"??nceden tan??mlanm???? kategoriyi devre d?????? b??rak??n",
							context_inpredefined:				"??nceden tan??mlanm???? bir kategoriye sabitlenmi??",
							context_pinchannel:					"Kanal listesine sabitle",
							context_pindm:						"Do??rudan mesaj?? sabitle",
							context_pinguild:					"Sunucu listesine sabitle",
							context_unpinchannel:				"Kanal listesinden ????kar",
							context_unpinguild:					"Sunucu listesinden ay??r",
							header_pinneddms:					"Sabitlenmi?? do??rudan mesajlar",
							modal_colorpicker1:					"Kategori rengi"
						};
					case "uk":		// Ukrainian
						return {
							context_addtonewcategory:			"???????????? ???? ?????????? ??????????????????",
							context_disablepredefined:			"???????????????? ?????????????????????? ?????????????????? ??????????????????",
							context_inpredefined:				"???????????????????? ?? ?????????????? ???????????????????? ??????????????????",
							context_pinchannel:					"?????????????????? ?? ???????????? ??????????????",
							context_pindm:						"?????????????????? ?????????? ????????????????????????",
							context_pinguild:					"?????????????????? ???? ???????????? ????????????????",
							context_unpinchannel:				"????????????????????? ?????? ???????????? ??????????????",
							context_unpinguild:					"??????'???????????? ?????? ???????????? ????????????????",
							header_pinneddms:					"???????????????????? ?????????? ????????????????????????",
							modal_colorpicker1:					"?????????? ??????????????????"
						};
					case "vi":		// Vietnamese
						return {
							context_addtonewcategory:			"Th??m v??o danh m???c m???i",
							context_disablepredefined:			"H???y k??ch ho???t danh m???c x??c ?????nh tr?????c",
							context_inpredefined:				"???????c ghim trong m???t danh m???c x??c ?????nh tr?????c",
							context_pinchannel:					"Ghim v??o danh s??ch k??nh",
							context_pindm:						"Ghim tin nh???n tr???c ti???p",
							context_pinguild:					"Ghim v??o danh s??ch m??y ch???",
							context_unpinchannel:				"T??ch kh???i danh s??ch k??nh",
							context_unpinguild:					"T??ch kh???i danh s??ch m??y ch???",
							header_pinneddms:					"Tin nh???n tr???c ti???p ???????c ghim",
							modal_colorpicker1:					"M??u s???c"
						};
					case "zh":		// Chinese
						return {
							context_addtonewcategory:			"??????????????????",
							context_disablepredefined:			"?????????????????????",
							context_inpredefined:				"??????????????????????????????",
							context_pinchannel:					"?????????????????????",
							context_pindm:						"??????????????????",
							context_pinguild:					"????????????????????????",
							context_unpinchannel:				"????????????????????????",
							context_unpinguild:					"???????????????????????????",
							header_pinneddms:					"??????????????????",
							modal_colorpicker1:					"????????????"
						};
					case "zh-TW":	// Chinese (Traditional)
						return {
							context_addtonewcategory:			"??????????????????",
							context_disablepredefined:			"?????????????????????",
							context_inpredefined:				"??????????????????????????????",
							context_pinchannel:					"?????????????????????",
							context_pindm:						"??????????????????",
							context_pinguild:					"????????????????????????",
							context_unpinchannel:				"????????????????????????",
							context_unpinguild:					"???????????????????????????",
							header_pinneddms:					"??????????????????",
							modal_colorpicker1:					"????????????"
						};
					default:		// English
						return {
							context_addtonewcategory:			"Add to new Category",
							context_disablepredefined:			"Deactivate predefined Category",
							context_inpredefined:				"Pinned in a predefined Category",
							context_pinchannel:					"Pin to Channel List",
							context_pindm:						"Pin DM",
							context_pinguild:					"Pin to Server List",
							context_unpinchannel:				"Detach from Channel List",
							context_unpinguild:					"Detach from Server List",
							header_pinneddms:					"Pinned Direct Messages",
							modal_colorpicker1:					"Category Color"
						};
				}
			}
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin(config));
})();
