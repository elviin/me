// Saves options to chrome.storage
function save_options() {
    var color = document.getElementById('color').value;
    var likesColor = document.getElementById('like').checked;
    chrome.storage.sync.set({
      favoriteColor: color,
      likesColor: likesColor
    }, function() {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 750);
    });
  }
  
  function main() {
    debugger;
    console.log("main()");
    restore_options();
  }

  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  function restore_options() {
    console.log("restore_options()");
    debugger;
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.local.get(['settings', 'global'], function(items) {
      console.log("chrome.storage.sync.get");
      debugger;
      console.log("items: " + items);
      console.log("items.settings: " + items.settings);
      if( !items.settings || !items.settings.length ) return;
        console.log("items.settings != nul");
        settings = items.settings[0];
        console.log("income " + settings.income.toString());
        console.log("costs " + settings.costs.toString());
        console.log("hours_per_day " + settings.hours_per_day.toString());
        console.log("hours_per_month " + settings.hours_per_month.toString());
        console.log("commuting " + settings.commuting.toString());
        document.getElementById('income').value = settings.income.toString();
        document.getElementById('costs').value = settings.costs.toString();
        document.getElementById('hours_per_day').value = settings.hours_per_day.toString();
        document.getElementById('hours_per_month').value = settings.hours_per_month.toString();
        document.getElementById('commuting').value = settings.commuting.toString();
    });
  }
  document.addEventListener('DOMContentLoaded', main);
  document.getElementById('save').addEventListener('click',
  saveGlobalSettings);

  function saveGlobalSettings() {
    
    const income = parseInt(document.getElementById("income").value);
    const costs = parseInt(document.getElementById("costs").value);
    const hours_per_day = parseInt(document.getElementById("hours_per_day").value);
    const hours_per_month = parseInt(document.getElementById("hours_per_month").value);
    const commuting = parseInt(document.getElementById("commuting").value);
    

    // Save all settings and more
    regex = "\/\\b^(USD|EUR|\\$|\\u20AC)?(\\s*)\\d+([\\.,\\,]\\d{3})*([\\.,\\,]\\d{1,3})?(\\s*)(USD|EUR|\\$|\\u20AC)?\\b\/i";
    global = {enabled: true, showChangelog: false, version: "2.0.10"};
    settings = [{active: true, case: "Maintain", repA: regex, repB: "CZK", type: "RegEx", income: income, costs: costs, hours_per_day: hours_per_day, hours_per_month: hours_per_month, commuting: commuting}];

    chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
          console.error(error);
      }
      chrome.storage.local.set( { settings : settings, global : global } );
    });

    
    //window.alert("COOL");
  }

  main();