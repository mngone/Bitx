var badge = {

  /**
   * Returns the date under the format "YYYY-MM-DD"
   * @param {date} a javascript date object
   */
  dateToYMD: function (date) {
    var d = date.getDate(),
      m = date.getMonth() + 1,
      y = date.getFullYear();
    return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
  },

  /**
   * Count Todos in one category
   * @param {string} status Count overdue, today, upcoming or undefined Todos
   * @param {string} input JSON string containing all myTodos
   */
  countTodos: function (input, status) {
    switch (status) {
    case 'no_due_date':
      return _.where(input, {
        due_at: null
      }).length;
    case 'today':
      return _.where(input, {
        due_at: badge.dateToYMD(new Date())
      }).length;
    case 'upcoming':
      return _.countBy(input, function (todo) {
        return (badge.dateToYMD(new Date(todo.due_at)) > badge.dateToYMD(new Date()));
      }).true;
    case 'overdues':
      return _.countBy(input, function (todo) {
        if (todo.due_at !== null)
          return (badge.dateToYMD(new Date(todo.due_at)) < badge.dateToYMD(new Date()));
      }).true;
    }
  },

  /**
   * Draw the extension badge in Chrome based on the Todos counter
   * localStorage['myTodos'] must be set
   */
  updateBadge: function (myTodos) {
    try {
      if (myTodos) {
        var counter_todos = localStorage.counter_todos;
        var color;
        var counter;
        if (counter_todos === 'overdues') {
          color = {
            color: '#F54E4A'
          };
        } else {
          color = {
            color: '#5e9ac9'
          };
        }
        if (counter_todos === 'default') {
          counter = badge.countTodos(myTodos, 'overdues');
          color = {
            color: '#F54E4A'
          };
          if (!counter) {
            counter = badge.countTodos(myTodos, 'today');
            color = {
              color: '#5e9ac9'
            };
            if (!counter) {
              counter = badge.countTodos(myTodos, 'upcoming');
              if (!counter) {
                counter = badge.countTodos(myTodos, 'no_due_date');
              }
            }
          }
        } else {
          counter = badge.countTodos(myTodos, counter_todos);
        }
        if (!counter) {
          counter = '';
        }
        chrome.browserAction.setBadgeBackgroundColor(color);
        chrome.browserAction.setBadgeText({
          text: counter.toString()
        });
        chrome.browserAction.setIcon({
          path: './img/icon-active.png'
        });
        console.log('LOG: updateBadge');
        localStorage.updateBadge = false;
      } else {
        chrome.browserAction.setIcon({
          path: './img/icon-inactive.png'
        });
        chrome.browserAction.setBadgeText({
          text: ""
        });
      }
    } catch (e) {
      console.log('ERROR: updateBadge ' + e);
      chrome.browserAction.setBadgeText({
        text: ''
      });
      chrome.browserAction.setIcon({
        path: '../icon-inactive.png'
      });
    }
  }
};